"""D8 address correction engine.

Every result follows one contract (FINAL_PROMPT §0-F.3.3, D8):

    {original, corrected, reason, confidence, needs_question, options[]}

The engine is deterministic: the LLM never writes an address. It normalises
what the driver said, checks the house number against the address store, and
either corrects it, says why, or asks a single question with the options the
driver can answer out loud.
"""
from __future__ import annotations

import json
import re
import sqlite3
from collections.abc import Iterable
from dataclasses import dataclass, field
from difflib import SequenceMatcher
from pathlib import Path
from typing import Protocol

from . import nz_address

# ---------------------------------------------------------------------------
# Data model
# ---------------------------------------------------------------------------


@dataclass(frozen=True)
class Address:
    """One addressable point, as published by LINZ NZ Addresses."""

    linz_address_id: str
    number: str
    road: str
    suburb: str
    town: str = ""
    suffix: str | None = None
    unit: str | None = None
    postcode: str | None = None
    lat: float | None = None
    lon: float | None = None

    @property
    def number_with_suffix(self) -> str:
        return f"{self.number}{self.suffix or ''}"

    @property
    def display(self) -> str:
        parts = []
        if self.unit:
            parts.append(f"{self.unit}/{self.number_with_suffix}")
        else:
            parts.append(self.number_with_suffix)
        parts.append(self.road)
        if self.suburb:
            parts.append(self.suburb)
        if self.town:
            parts.append(self.town)
        return " ".join(parts)

    @property
    def road_key(self) -> str:
        return road_key(self.road)


@dataclass(frozen=True)
class Correction:
    """The D8 result contract."""

    original: str
    corrected: str | None
    reason: str
    confidence: float
    needs_question: bool
    options: list[str] = field(default_factory=list)
    linz_address_id: str | None = None
    changes: list[str] = field(default_factory=list)

    def as_dict(self) -> dict:
        return {
            "original": self.original,
            "corrected": self.corrected,
            "reason": self.reason,
            "confidence": round(self.confidence, 3),
            "needs_question": self.needs_question,
            "options": list(self.options),
            "linz_address_id": self.linz_address_id,
            "changes": list(self.changes),
        }


# ---------------------------------------------------------------------------
# Address stores
# ---------------------------------------------------------------------------


class AddressStore(Protocol):
    """Where the engine looks up addresses (LINZ data, the FTS slice, ...)."""

    def by_road(self, road: str) -> list[Address]:
        """Every address on a road (road key, see `road_key`)."""

    def roads(self) -> list[str]:
        """Every known road name."""

    def suburbs_for_road(self, road: str) -> list[str]:
        """Every suburb a road runs through."""

    def by_id(self, linz_address_id: str) -> Address | None:
        """A single address by its LINZ id."""


class InMemoryAddressStore:
    """Address store backed by a list of addresses (tests, fixtures, small areas)."""

    def __init__(self, addresses: Iterable[Address]) -> None:
        self._addresses = list(addresses)
        self._by_road: dict[str, list[Address]] = {}
        self._by_id: dict[str, Address] = {}
        for address in self._addresses:
            self._by_road.setdefault(address.road_key, []).append(address)
            self._by_id[address.linz_address_id] = address

    def by_road(self, road: str) -> list[Address]:
        return list(self._by_road.get(road, []))

    def roads(self) -> list[str]:
        return sorted({address.road for addresses in self._by_road.values() for address in addresses})

    def suburbs_for_road(self, road: str) -> list[str]:
        return sorted({address.suburb for address in self._by_road.get(road, [])})

    def by_id(self, linz_address_id: str) -> Address | None:
        return self._by_id.get(linz_address_id)

    @classmethod
    def from_json(cls, path: str | Path) -> InMemoryAddressStore:
        """Loads a fixture file: a JSON list of address objects."""
        payload = json.loads(Path(path).read_text(encoding="utf-8"))
        return cls(Address(**row) for row in payload)


class SqliteAddressStore:
    """Address store backed by the offline FTS slice built by `services/worker`."""

    def __init__(self, db_path: str | Path) -> None:
        self.db_path = Path(db_path)

    def _connect(self) -> sqlite3.Connection:
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        return conn

    def by_road(self, road: str) -> list[Address]:
        conn = self._connect()
        try:
            rows = conn.execute(
                "SELECT * FROM addresses WHERE road_key = ?", (road,)
            ).fetchall()
        finally:
            conn.close()
        return [_row_to_address(row) for row in rows]

    def roads(self) -> list[str]:
        conn = self._connect()
        try:
            rows = conn.execute("SELECT DISTINCT road FROM addresses").fetchall()
        finally:
            conn.close()
        return sorted(row["road"] for row in rows)

    def suburbs_for_road(self, road: str) -> list[str]:
        conn = self._connect()
        try:
            rows = conn.execute(
                "SELECT DISTINCT suburb FROM addresses WHERE road_key = ?", (road,)
            ).fetchall()
        finally:
            conn.close()
        return sorted(row["suburb"] for row in rows)

    def by_id(self, linz_address_id: str) -> Address | None:
        conn = self._connect()
        try:
            row = conn.execute(
                "SELECT * FROM addresses WHERE linz_address_id = ?", (linz_address_id,)
            ).fetchone()
        finally:
            conn.close()
        return _row_to_address(row) if row else None


def _row_to_address(row: sqlite3.Row) -> Address:
    keys = row.keys()
    return Address(
        linz_address_id=row["linz_address_id"],
        number=str(row["street_number"]),
        road=row["street_name"],
        suburb=row["suburb"],
        town=row["city"] if "city" in keys else "",
        suffix=row["street_number_suffix"] if "street_number_suffix" in keys else None,
        unit=row["unit_value"] if "unit_value" in keys else None,
        postcode=row["postcode"] if "postcode" in keys else None,
        lat=row["latitude"] if "latitude" in keys else None,
        lon=row["longitude"] if "longitude" in keys else None,
    )


# ---------------------------------------------------------------------------
# Normalisation helpers
# ---------------------------------------------------------------------------

_STREET_TYPES = {
    "street": "st", "st": "st", "road": "rd", "rd": "rd", "avenue": "ave", "ave": "ave",
    "drive": "dr", "dr": "dr", "place": "pl", "pl": "pl", "crescent": "cres", "cres": "cres",
    "terrace": "tce", "tce": "tce", "lane": "ln", "ln": "ln", "close": "cl", "cl": "cl",
    "court": "ct", "ct": "ct", "way": "way", "grove": "gr", "gr": "gr", "mews": "mews",
    "quay": "quay", "parade": "pde", "pde": "pde", "highway": "hwy", "hwy": "hwy",
    "square": "sq", "sq": "sq", "esplanade": "esp", "esp": "esp", "bypass": "byp",
    "byp": "byp", "motorway": "shwy", "shwy": "shwy",
}

_UNIT_WORDS = ("unit", "flat", "apartment", "apt", "suite")

# "7 ... no, 17" -> the driver corrected themselves.
_CORRECTION_MARKER = re.compile(
    r"\b(?:no|nope|nah|sorry|actually|i mean|mean|scratch that|change that|make that)\b",
    re.IGNORECASE,
)


def road_key(road: str) -> str:
    """Normalised key for a road name ("Main North Road" -> "main north rd")."""
    text = re.sub(r"[^a-z0-9 ]+", " ", road.lower())
    tokens = [token for token in text.split() if token]
    if tokens and tokens[-1] in _STREET_TYPES:
        tokens[-1] = _STREET_TYPES[tokens[-1]]
    return " ".join(tokens)


def similarity(left: str, right: str) -> float:
    """0..1 similarity between two road names."""
    if not left or not right:
        return 0.0
    if left == right:
        return 1.0
    ratio = SequenceMatcher(None, left, right).ratio()
    left_tokens = set(left.split())
    right_tokens = set(right.split())
    shared = left_tokens & right_tokens
    if left_tokens and right_tokens:
        jaccard = len(shared) / len(left_tokens | right_tokens)
        ratio = max(ratio, jaccard)
    return ratio


def _as_int(number: str | None) -> int | None:
    if not number:
        return None
    digits = re.sub(r"[^0-9]", "", number)
    return int(digits) if digits else None


# ---------------------------------------------------------------------------
# The corrector
# ---------------------------------------------------------------------------


class AddressCorrector:
    """Turns what the driver said into a LINZ address, or into one question."""

    def __init__(self, store: AddressStore, threshold: float = 0.72) -> None:
        self.store = store
        self.threshold = threshold

    # -- public API ---------------------------------------------------------

    def correct(self, raw: str) -> Correction:
        original = raw
        text = self._apply_self_correction(raw)
        parsed = nz_address.parse(text)

        if not parsed.street:
            return Correction(
                original=original,
                corrected=None,
                reason="could not understand the street name",
                confidence=0.0,
                needs_question=True,
                options=[],
            )

        road, road_score = self._match_road(parsed.street)
        if road is None:
            return Correction(
                original=original,
                corrected=None,
                reason=f"no known street called '{parsed.street}'",
                confidence=0.0,
                needs_question=True,
                options=[],
            )

        road_suburbs = self.store.suburbs_for_road(road_key(road))
        suburb = self._match_suburb(parsed.suburb, road_suburbs)

        if suburb is None and len(road_suburbs) > 1:
            return Correction(
                original=original,
                corrected=None,
                reason=f"'{road}' runs through several suburbs",
                confidence=round(road_score * 0.5, 3),
                needs_question=True,
                options=list(road_suburbs),
            )

        candidates = self.store.by_road(road_key(road))
        if suburb:
            scoped = [item for item in candidates if item.suburb == suburb]
            if scoped:
                candidates = scoped

        if not candidates:
            return Correction(
                original=original,
                corrected=None,
                reason=f"no addresses known on '{road}'",
                confidence=0.0,
                needs_question=True,
                options=[],
            )

        return self._resolve_number(original, parsed, road, road_score, candidates)

    # -- steps --------------------------------------------------------------

    def _apply_self_correction(self, raw: str) -> str:
        """Handles "7 ... no, 17" and "no, 17 Main North Rd"."""
        marker = _CORRECTION_MARKER.search(raw)
        if not marker:
            return raw.strip()

        before = raw[: marker.start()].strip()
        after = raw[marker.end() :].strip()
        number = re.search(r"\b(\d+[a-z]?)\b", after)
        if not number:
            return raw.strip()

        new_number = number.group(1)
        if not before:
            # "no, 17 Main North Rd" -> the whole address follows the correction.
            return f"{new_number} {after[number.end():].strip()}".strip()

        # "7 Main North Rd, Papanui, no sorry 17" -> keep the address, take the new number.
        cleaned = re.sub(r"\b\d+[a-z]?\b", " ", before, count=1)
        cleaned = re.sub(r"\s+", " ", cleaned).strip(" ,")
        return f"{new_number} {cleaned}".strip()

    def _match_road(self, street: str) -> tuple[str | None, float]:
        key = road_key(street)
        known = self.store.roads()
        if any(road_key(candidate) == key for candidate in known):
            return next(candidate for candidate in known if road_key(candidate) == key), 1.0

        best_name, best_score = None, 0.0
        for candidate in known:
            score = similarity(key, road_key(candidate))
            if score > best_score:
                best_name, best_score = candidate, score
        if best_score >= 0.78:
            return best_name, best_score
        return None, best_score

    def _match_suburb(self, suburb: str | None, road_suburbs: list[str]) -> str | None:
        if not road_suburbs:
            return suburb
        if not suburb:
            return None
        lowered = {value.lower(): value for value in road_suburbs}
        if suburb.lower() in lowered:
            return lowered[suburb.lower()]
        best_name, best_score = None, 0.0
        for value in road_suburbs:
            score = similarity(suburb.lower(), value.lower())
            if score > best_score:
                best_name, best_score = value, score
        if best_score >= 0.8:
            return best_name
        return None

    def _resolve_number(
        self,
        original: str,
        parsed: nz_address.ParsedAddress,
        road: str,
        road_score: float,
        candidates: list[Address],
    ) -> Correction:
        number = _as_int(parsed.number)
        suffix = (parsed.suffix or "").upper() or None
        changes: list[str] = []

        exact = [
            item
            for item in candidates
            if _as_int(item.number) == number
            and (item.suffix or "").upper() == (suffix or "")
        ]
        if parsed.unit:
            with_unit = [item for item in exact if item.unit == parsed.unit]
            if with_unit:
                exact = with_unit
        if exact:
            best = exact[0]
            if parsed.unit and not best.unit:
                changes.append(f"unit {parsed.unit} added")
            confidence = min(1.0, 0.85 + 0.15 * road_score)
            return Correction(
                original=original,
                corrected=best.display,
                reason="address matched in the address database",
                confidence=round(confidence, 3),
                needs_question=False,
                options=[],
                linz_address_id=best.linz_address_id,
                changes=changes,
            )

        same_number = [item for item in candidates if _as_int(item.number) == number]
        if same_number:
            best = same_number[0]
            changes.append(f"suffix {suffix} matched {best.number_with_suffix}")
            return Correction(
                original=original,
                corrected=best.display,
                reason="house number found with a different suffix",
                confidence=round(min(1.0, 0.7 + 0.2 * road_score), 3),
                needs_question=False,
                options=[],
                linz_address_id=best.linz_address_id,
                changes=changes,
            )

        numbers = {_as_int(item.number) for item in candidates}
        existing = sorted(value for value in numbers if value is not None)
        if not existing:
            return Correction(
                original=original,
                corrected=None,
                reason=f"no house numbers known on '{road}'",
                confidence=round(road_score * 0.5, 3),
                needs_question=True,
                options=[],
            )

        # Rural delivery addresses keep their long numbers.
        if number is not None and number >= 1000 and min(existing) >= 1000:
            nearest_rd = sorted(existing, key=lambda value: (abs(value - number), value))[:3]
            return Correction(
                original=original,
                corrected=None,
                reason=(
                    f"rural delivery address: house number {parsed.number} is not on "
                    f"'{road}'"
                ),
                confidence=round(min(1.0, 0.6 + 0.3 * road_score), 3),
                needs_question=True,
                options=[f"{value} {road}" for value in nearest_rd],
            )

        # "1400" spoken for "140": drop the trailing zeros when that hits.
        if number is not None:
            for divisor in (10, 100, 1000):
                if number % divisor:
                    continue
                shortened = number // divisor
                if shortened in existing:
                    best = next(item for item in candidates if _as_int(item.number) == shortened)
                    changes.append(f"house number {number} corrected to {shortened}")
                    return Correction(
                        original=original,
                        corrected=best.display,
                        reason=(
                            f"house number {parsed.number} does not exist on '{road}', "
                            f"corrected to {shortened}"
                        ),
                        confidence=round(min(1.0, 0.65 + 0.25 * road_score), 3),
                        needs_question=False,
                        options=[],
                        linz_address_id=best.linz_address_id,
                        changes=changes,
                    )

        nearest = sorted(existing, key=lambda value: (abs(value - (number or 0)), value))[:3]
        options = [f"{value} {road}" for value in nearest]
        return Correction(
            original=original,
            corrected=None,
            reason=f"house number {parsed.number} does not exist on '{road}'",
            confidence=round(min(0.6, road_score * 0.7), 3),
            needs_question=True,
            options=options,
        )
