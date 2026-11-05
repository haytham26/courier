"""The spreadsheet stop import (D52's server half, ADR-025).

A CSV or Excel file with a header row: `address` is required; `type`,
`priority`, `parcels`, `service_time_s`, `window_start` and `window_end` are
optional, matched by name against the aliases below (case and punctuation
insensitive, so "Delivery Address" maps too). The import is all-or-nothing:
the whole file is validated before one row is stored, and a row without an
address refuses the import with the row named - a silent mis-import is the
exact failure D52 warned about. Unknown columns are not dropped silently
either: the answer carries them in `ignored_columns`.

The stops are stored unlocated (latitude/longitude NULL): the API has no
geocoder yet (the address-intelligence slice owns it), so the routing layer
reports them through `unroutable_stop_ids` until the address engine lands,
exactly as it does for an intake stop it cannot place.
"""

from __future__ import annotations

import csv
import io
import re
import uuid
import zipfile
from datetime import datetime
from xml.etree.ElementTree import ParseError

import openpyxl
from openpyxl.utils.exceptions import InvalidFileException

from . import nz_address
from .locations import location_id_for
from .repo import ImportedStopRow
from .routing import MAX_ROUTE_STOPS

#: The upload cap, the same shape as the POD's: the declared name is never
#: trusted, so the bytes are counted before anything parses them.
IMPORT_MAX_BYTES = 5 * 1024 * 1024

#: The row cap IS the routing layer's own cap (BUG-211): a file of 501 to 1000
#: rows used to be accepted and stored, and then every route call for that
#: shift failed with a 422 - the import had accepted a day the planner cannot
#: route. One cap, one number, no window between them.
MAX_IMPORT_ROWS = MAX_ROUTE_STOPS

#: The cap on a shift's stops in total: the import is not the only writer (the
#: demo seed, the intake manifests), so repeated imports must not push a shift
#: past what the planner can route (BUG-211).
MAX_STOPS_PER_SHIFT = MAX_ROUTE_STOPS

#: The cap on what an .xlsx may UNPACK to (BUG-211): the upload is capped at
#: 5 MiB, but a zip bomb unpacks those bytes into gigabytes of sheet XML, and
#: the workbook is opened over the unpacked bytes. The archive's own index
#: names the total before anything is inflated.
MAX_XLSX_UNCOMPRESSED_BYTES = 50 * 1024 * 1024

#: The column cap read from a sheet while it streams: the parser's own header
#: lookup uses the first row's names, and a sheet with a million columns must
#: not be materialised to reach them.
_MAX_SHEET_COLUMNS = 512

ADDRESS_HEADERS = ("address", "street", "delivery_address", "addr")
TYPE_HEADERS = ("type", "stop_type", "kind")
PRIORITY_HEADERS = ("priority", "urgent")
PARCELS_HEADERS = ("parcels", "parcel_count", "qty", "quantity")
SERVICE_HEADERS = ("service_time_s", "service_seconds", "service_time")
WINDOW_START_HEADERS = ("window_start", "time_window_start", "from")
WINDOW_END_HEADERS = ("window_end", "time_window_end", "to")

STOP_TYPES = ("delivery", "pickup")
_TRUE_WORDS = frozenset({"true", "1", "yes", "y"})
_FALSE_WORDS = frozenset({"false", "0", "no", "n", ""})

_XLSX_MAGIC = b"PK\x03\x04"


class ImportFormatError(ValueError):
    """The file is not an importable spreadsheet: the message names the row."""


def sniff_import_kind(filename: str, content: bytes) -> str | None:
    """'csv' or 'xlsx' when the name AND the bytes agree; None otherwise.

    An .xlsx must carry the zip magic; a .csv must not (a zip renamed .csv
    is refused, not parsed as garbage); the CSV must decode as UTF-8.
    """
    name = (filename or "").lower()
    if content.startswith(_XLSX_MAGIC):
        return "xlsx" if name.endswith((".xlsx", ".xlsm")) else None
    if name.endswith(".csv"):
        try:
            content.decode("utf-8-sig")
        except UnicodeDecodeError:
            return None
        return "csv"
    return None


def _normalise(header: str) -> str:
    return re.sub(r"[^a-z0-9]+", "_", header.strip().lower()).strip("_")


def _first_index(header: list[str], aliases: tuple[str, ...]) -> int | None:
    for alias in aliases:
        if alias in header:
            return header.index(alias)
    return None


def _cell_text(value: object) -> str:
    """One spreadsheet cell as text: booleans and whole numbers normalise,
    datetimes keep their ISO shape, None is the empty cell."""
    if value is None:
        return ""
    if isinstance(value, bool):
        return "true" if value else "false"
    if isinstance(value, datetime):
        return value.isoformat()
    if isinstance(value, float) and value.is_integer():
        return str(int(value))
    return str(value)


def _rows_csv(content: bytes) -> list[list[str]]:
    text = content.decode("utf-8-sig")
    return [list(row) for row in csv.reader(io.StringIO(text))]


def _rows_xlsx(content: bytes) -> list[list[str]]:
    """The sheet's rows as text, streamed and bounded (BUG-211).

    Three defences, because the declared 5 MiB upload cap is not one:

    - the archive's own inflatable total is read from the zip's index BEFORE
      the workbook is opened, so a zip bomb (megabytes of XML) is refused with
      its name rather than unpacked;
    - a file whose bytes are not a readable spreadsheet (renamed, corrupt, or
      a zip that is not a workbook) is refused as a 422, not a 500 - openpyxl's
      own exceptions are mapped here;
    - the rows and columns are capped while they stream, so a sheet with a
      billion empty rows cannot be materialised before the parse's own caps
      refuse it.
    """
    try:
        archive = zipfile.ZipFile(io.BytesIO(content))
    except zipfile.BadZipFile as error:
        raise ImportFormatError(f"the .xlsx is not a readable zip archive ({error})") from None
    with archive:
        uncompressed = sum(info.file_size for info in archive.infolist())
    if uncompressed > MAX_XLSX_UNCOMPRESSED_BYTES:
        raise ImportFormatError(
            f"the .xlsx unpacks to {uncompressed} bytes, past the "
            f"{MAX_XLSX_UNCOMPRESSED_BYTES} byte ceiling"
        )
    try:
        workbook = openpyxl.load_workbook(io.BytesIO(content), read_only=True, data_only=True)
    except (
        zipfile.BadZipFile,
        InvalidFileException,
        KeyError,
        ParseError,
        ValueError,
        OSError,
    ) as error:
        # BUG-211: whatever openpyxl raises on untrusted bytes - a missing entry
        # (KeyError), a truncated archive (BadZipFile), a broken sheet
        # (ParseError) - is the FILE's problem, answered as a 422 naming it. A
        # parser on untrusted bytes never turns the file's defect into the
        # server's 500.
        raise ImportFormatError(f"the .xlsx is not a readable spreadsheet ({error})") from None
    try:
        sheet = workbook.active
        if sheet is None:
            return []
        rows: list[list[str]] = []
        for values in sheet.iter_rows(values_only=True):
            rows.append([_cell_text(cell) for cell in values[:_MAX_SHEET_COLUMNS]])
            if len(rows) > MAX_IMPORT_ROWS:
                break
        return rows
    finally:
        workbook.close()


def _cell(cells: list[str], index: int | None) -> str:
    if index is None or index >= len(cells):
        return ""
    return cells[index].strip()


def _parse_window(value: str, field: str, file_row: int) -> datetime | None:
    if not value:
        return None
    try:
        parsed = datetime.fromisoformat(value)
    except ValueError:
        raise ImportFormatError(
            f"row {file_row}: {field} is not a date-time ({value!r})"
        ) from None
    if parsed.tzinfo is None:
        raise ImportFormatError(
            f"row {file_row}: {field} must carry a timezone (e.g. 2026-11-03T07:30:00+13:00)"
        )
    return parsed


def _parse_int(value: str, field: str, file_row: int, minimum: int) -> int:
    try:
        number = int(value)
    except ValueError:
        raise ImportFormatError(
            f"row {file_row}: {field} must be a whole number ({value!r})"
        ) from None
    if number < minimum:
        raise ImportFormatError(
            f"row {file_row}: {field} must be at least {minimum} ({value!r})"
        )
    return number


def _parse_row(
    file_row: int, cells: list[str], columns: dict[str, int | None]
) -> ImportedStopRow:
    address = _cell(cells, columns["address"])
    if not address:
        raise ImportFormatError(f"row {file_row} has no address")
    type_value = _cell(cells, columns["type"]).lower()
    if type_value and type_value not in STOP_TYPES:
        raise ImportFormatError(
            f"row {file_row}: type must be one of {STOP_TYPES}, got {type_value!r}"
        )
    priority_value = _cell(cells, columns["priority"]).lower()
    if priority_value not in _TRUE_WORDS | _FALSE_WORDS:
        raise ImportFormatError(
            f"row {file_row}: priority must be true/false/yes/no/1/0, got {priority_value!r}"
        )
    parcels_value = _cell(cells, columns["parcels"])
    service_value = _cell(cells, columns["service_time_s"])
    window_start = _parse_window(_cell(cells, columns["window_start"]), "window_start", file_row)
    window_end = _parse_window(_cell(cells, columns["window_end"]), "window_end", file_row)
    if window_start is not None and window_end is not None and window_end <= window_start:
        raise ImportFormatError(
            f"row {file_row}: window_end must be after window_start"
        )
    parsed_address = nz_address.parse(address)
    suburb = parsed_address.suburb
    return ImportedStopRow(
        address=address,
        suburb=suburb,
        location_id=location_id_for(address, suburb),
        type=type_value or "delivery",
        priority=priority_value in _TRUE_WORDS,
        parcels=_parse_int(parcels_value, "parcels", file_row, 1) if parcels_value else 1,
        service_time_s=(
            _parse_int(service_value, "service_time_s", file_row, 0) if service_value else None
        ),
        window_start=window_start,
        window_end=window_end,
    )


def parse_import(content: bytes, kind: str) -> tuple[list[ImportedStopRow], list[str]]:
    """Parse and validate the whole file; raise ImportFormatError naming the row.

    Returns the stops in file order and the header columns that matched no
    known field (answered back as `ignored_columns`, never dropped silently).
    """
    raw = _rows_csv(content) if kind == "csv" else _rows_xlsx(content)
    if not raw:
        raise ImportFormatError("the file is empty")
    header = [_normalise(cell) for cell in raw[0]]
    columns = {
        "address": _first_index(header, ADDRESS_HEADERS),
        "type": _first_index(header, TYPE_HEADERS),
        "priority": _first_index(header, PRIORITY_HEADERS),
        "parcels": _first_index(header, PARCELS_HEADERS),
        "service_time_s": _first_index(header, SERVICE_HEADERS),
        "window_start": _first_index(header, WINDOW_START_HEADERS),
        "window_end": _first_index(header, WINDOW_END_HEADERS),
    }
    if columns["address"] is None:
        raise ImportFormatError(
            "the header row has no address column "
            f"(accepted: {', '.join(ADDRESS_HEADERS)})"
        )
    known = {index for index in columns.values() if index is not None}
    ignored = [
        raw[0][index].strip()
        for index in range(len(header))
        if index not in known and raw[0][index].strip()
    ]
    stops: list[ImportedStopRow] = []
    for file_row, cells in enumerate(raw[1:], start=2):
        if not any(cell.strip() for cell in cells):
            continue  # a blank line is not a stop
        if len(stops) >= MAX_IMPORT_ROWS:
            raise ImportFormatError(
                f"the file has more than {MAX_IMPORT_ROWS} stop rows"
            )
        stops.append(_parse_row(file_row, cells, columns))
    if not stops:
        raise ImportFormatError("the file has a header row but no stop rows")
    return stops, ignored


__all__ = [
    "IMPORT_MAX_BYTES",
    "MAX_IMPORT_ROWS",
    "ImportFormatError",
    "parse_import",
    "sniff_import_kind",
    "uuid",
]
