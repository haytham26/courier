"""Tests for the D8 address correction engine.

Contract (FINAL_PROMPT §0-F.3.3): every result is
``{original, corrected, reason, confidence, needs_question, options[]}``.

The fixture holds real Christchurch streets and suburbs. The LINZ ids are
placeholders (`fixture-chch-...`) until the founder provides the real LINZ
export in `data/linz/` (see `docs/status/FOUNDER_TODO.md`).
"""
from __future__ import annotations

import sqlite3
from pathlib import Path

import pytest

from app.address_correction import (
    AddressCorrector,
    Address,
    InMemoryAddressStore,
    SqliteAddressStore,
    _as_int,
    _prefer_plain_address,
    road_key,
    similarity,
)

FIXTURE = Path(__file__).parent / "fixtures" / "christchurch_addresses.json"


@pytest.fixture(scope="module")
def store() -> InMemoryAddressStore:
    return InMemoryAddressStore.from_json(FIXTURE)


@pytest.fixture(scope="module")
def corrector(store: InMemoryAddressStore) -> AddressCorrector:
    return AddressCorrector(store)


class TestContract:
    def test_result_has_the_d8_keys(self, corrector: AddressCorrector) -> None:
        result = corrector.correct("140 Main North Rd, Papanui").as_dict()

        assert set(result) >= {
            "original",
            "corrected",
            "reason",
            "confidence",
            "needs_question",
            "options",
        }

    def test_confidence_is_a_probability(self, corrector: AddressCorrector) -> None:
        result = corrector.correct("140 Main North Rd, Papanui")

        assert 0.0 <= result.confidence <= 1.0

    def test_original_is_preserved_verbatim(self, corrector: AddressCorrector) -> None:
        raw = "one four two Main North Road Papanui"

        assert corrector.correct(raw).original == raw


class TestExactMatch:
    def test_corrects_a_known_address(self, corrector: AddressCorrector) -> None:
        result = corrector.correct("140 Main North Rd, Papanui")

        assert result.corrected == "140 Main North Rd Papanui Christchurch"
        assert result.needs_question is False
        assert result.options == []
        assert result.linz_address_id == "fixture-chch-001"
        assert result.confidence > 0.9

    def test_accepts_the_full_street_type(self, corrector: AddressCorrector) -> None:
        result = corrector.correct("140 Main North Road Papanui")

        assert result.corrected == "140 Main North Rd Papanui Christchurch"

    def test_normalises_spoken_numbers(self, corrector: AddressCorrector) -> None:
        result = corrector.correct("one four two Main North Rd Papanui")

        assert result.corrected == "142 Main North Rd Papanui Christchurch"

    def test_keeps_the_matched_lin_z_id(self, corrector: AddressCorrector) -> None:
        result = corrector.correct("22 Riccarton Rd, Riccarton")

        assert result.linz_address_id == "fixture-chch-024"


class TestMisspelling:
    def test_corrects_a_misspelled_suburb(self, corrector: AddressCorrector) -> None:
        result = corrector.correct("22 Riccarton Rd, Rickerton")

        assert result.corrected == "22 Riccarton Rd Riccarton Christchurch"
        assert "Riccarton" in result.corrected

    def test_corrects_a_misspelled_street(self, corrector: AddressCorrector) -> None:
        result = corrector.correct("20 Horesworth Rd, Papanui")

        assert result.corrected == "20 Holdsworth Rd Papanui Christchurch"
        assert result.changes or result.reason


class TestNonExistentNumber:
    def test_1400_becomes_140(self, corrector: AddressCorrector) -> None:
        result = corrector.correct("1400 Main North Rd, Papanui")

        assert result.corrected == "140 Main North Rd Papanui Christchurch"
        assert result.needs_question is False
        assert "140" in result.reason

    def test_an_unknown_number_asks_with_options(self, corrector: AddressCorrector) -> None:
        result = corrector.correct("999 Main North Rd, Papanui")

        assert result.corrected is None
        assert result.needs_question is True
        assert result.options
        assert all("Main North Rd" in option for option in result.options)


class TestSelfCorrection:
    def test_uses_the_corrected_number(self, corrector: AddressCorrector) -> None:
        result = corrector.correct("7 Main North Rd, Papanui no sorry 142 Main North Rd")

        assert result.corrected == "142 Main North Rd Papanui Christchurch"

    def test_handles_a_leading_correction(self, corrector: AddressCorrector) -> None:
        result = corrector.correct("no, 22 Riccarton Rd Riccarton")

        assert result.corrected == "22 Riccarton Rd Riccarton Christchurch"


class TestAmbiguousSuburb:
    def test_asks_which_suburb(self, corrector: AddressCorrector) -> None:
        result = corrector.correct("140 Main North Rd")

        assert result.needs_question is True
        assert result.corrected is None
        assert set(result.options) >= {"Papanui", "Redwood"}

    def test_uses_the_suburb_when_given(self, corrector: AddressCorrector) -> None:
        result = corrector.correct("34 Main North Rd, Redwood")

        assert result.corrected == "34 Main North Rd Redwood Christchurch"
        assert result.needs_question is False


class TestUnitsAndFlats:
    def test_keeps_the_unit(self, corrector: AddressCorrector) -> None:
        result = corrector.correct("2/18 Harewood St, Bishopdale")

        assert result.corrected == "2/18 Harewood St Bishopdale Christchurch"

    def test_reads_a_flat_as_a_unit(self, corrector: AddressCorrector) -> None:
        result = corrector.correct("Flat 1, 12 Colombo St, Central City")

        assert result.corrected == "1/12 Colombo St Central City Christchurch"

    def test_a_bare_number_is_not_a_unit(self, corrector: AddressCorrector) -> None:
        result = corrector.correct("12 Colombo St, Central City")

        assert result.corrected == "12 Colombo St Central City Christchurch"


class TestRuralAddresses:
    def test_keeps_a_rural_delivery_number(self, corrector: AddressCorrector) -> None:
        result = corrector.correct("2299 Northampton Rd, Kaiapoi")

        assert result.needs_question is True
        assert "rural" in result.reason.lower()


class TestUnknownInput:
    def test_unknown_street_asks(self, corrector: AddressCorrector) -> None:
        result = corrector.correct("42 Nonexistent Lane, Nowhere")

        assert result.needs_question is True
        assert result.corrected is None
        assert result.confidence < 0.5

    def test_empty_input_asks(self, corrector: AddressCorrector) -> None:
        result = corrector.correct("")

        assert result.needs_question is True
        assert result.corrected is None


class TestRoadKey:
    def test_street_types_are_normalised(self) -> None:
        assert road_key("Main North Road") == road_key("Main North Rd")
        assert road_key("Harewood Street") == road_key("Harewood St")
        assert road_key("  main   north  rd ") == "main north rd"


class TestAccuracyOnTheFixture:
    """Every fixture address must be found again from its spoken form."""

    def test_accuracy_is_at_least_95_percent(self, store: InMemoryAddressStore) -> None:
        corrector = AddressCorrector(store)
        addresses = list(store.by_road("")) or _all_addresses(store)

        correct = 0
        for address in addresses:
            spoken = f"{address.number} {address.road}, {address.suburb}"
            result = corrector.correct(spoken)
            if result.corrected == address.display:
                correct += 1

        ratio = correct / len(addresses)
        assert ratio >= 0.95, f"{correct}/{len(addresses)} = {ratio:.2%}"

    def test_the_fixture_has_at_least_fifty_addresses(self, store: InMemoryAddressStore) -> None:
        assert len(_all_addresses(store)) >= 50


def _all_addresses(store: InMemoryAddressStore) -> list:
    addresses = []
    for road in store.roads():
        addresses.extend(store.by_road(road_key(road)))
    return addresses


# ---------------------------------------------------------------------------
# The engine paths the CI coverage ratchet must keep covered (>= 81 %):
# the stores, the normalisation helpers and the correction branches that the
# happy-path tests above never reach.
# ---------------------------------------------------------------------------


class TestInMemoryStore:
    def test_by_id_returns_the_linz_record_and_none_for_unknown(
        self, store: InMemoryAddressStore
    ) -> None:
        known = _all_addresses(store)[0]

        assert store.by_id(known.linz_address_id) is known
        assert store.by_id("linz-not-in-the-slice") is None


_FULL_SLICE_SCHEMA = """
CREATE TABLE addresses (
    linz_address_id TEXT PRIMARY KEY,
    street_number TEXT,
    street_number_suffix TEXT,
    unit_value TEXT,
    street_name TEXT,
    road TEXT,
    suburb TEXT,
    road_key TEXT,
    city TEXT,
    postcode TEXT,
    latitude REAL,
    longitude REAL
)
"""

_THIN_SLICE_SCHEMA = """
CREATE TABLE addresses (
    linz_address_id TEXT PRIMARY KEY,
    street_number TEXT,
    street_name TEXT,
    road TEXT,
    suburb TEXT,
    road_key TEXT
)
"""


class TestSqliteAddressStore:
    """The reader of the offline FTS slice.

    Two slices are built the way a regional LINZ export would write them: one
    with every column the export carries and one with only the columns a thin
    export keeps. `_row_to_address` fills the columns a thin slice misses
    with empty defaults, and the store feeds the engine like any other store.
    """

    @pytest.fixture(scope="class")
    def full_slice(self, tmp_path_factory: pytest.TempPathFactory) -> SqliteAddressStore:
        db = tmp_path_factory.mktemp("slice") / "chch.db"
        conn = sqlite3.connect(db)
        conn.execute(_FULL_SLICE_SCHEMA)
        conn.execute(
            "INSERT INTO addresses VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
            (
                "linz-slice-1",
                "16",
                "A",
                "27",
                "Dundee Pl",
                "Dundee Pl",
                "Linwood",
                "dundee pl",
                "Christchurch",
                "8011",
                -43.5333,
                172.6362,
            ),
        )
        conn.commit()
        conn.close()
        return SqliteAddressStore(db)

    def test_by_road_reads_the_full_slice_row(self, full_slice: SqliteAddressStore) -> None:
        addresses = full_slice.by_road("dundee pl")

        assert len(addresses) == 1
        address = addresses[0]
        assert address.linz_address_id == "linz-slice-1"
        assert address.number == "16"
        assert address.suffix == "A"
        assert address.number_with_suffix == "16A"
        assert address.unit == "27"
        assert address.road == "Dundee Pl"
        assert address.suburb == "Linwood"
        assert address.town == "Christchurch"
        assert address.postcode == "8011"
        assert address.lat == -43.5333
        assert address.lon == 172.6362

    def test_a_thin_slice_keeps_the_empty_defaults(self, tmp_path: Path) -> None:
        db = tmp_path / "thin.db"
        conn = sqlite3.connect(db)
        conn.execute(_THIN_SLICE_SCHEMA)
        conn.execute(
            "INSERT INTO addresses VALUES (?, ?, ?, ?, ?, ?)",
            ("linz-slice-2", "20", "Quiet Rd", "Quiet Rd", "Rural", "quiet rd"),
        )
        conn.commit()
        conn.close()
        store = SqliteAddressStore(db)

        address = store.by_road("quiet rd")[0]

        assert address.town == ""
        assert address.suffix is None
        assert address.unit is None
        assert address.postcode is None
        assert address.lat is None
        assert address.lon is None
        assert address.display == "20 Quiet Rd Rural"

    def test_roads_lists_the_distinct_road_names(self, full_slice: SqliteAddressStore) -> None:
        assert full_slice.roads() == ["Dundee Pl"]

    def test_suburbs_for_road_answers_by_road_key(self, full_slice: SqliteAddressStore) -> None:
        assert full_slice.suburbs_for_road("dundee pl") == ["Linwood"]
        assert full_slice.suburbs_for_road("unknown rd") == []

    def test_by_id_reads_one_row_or_none(self, full_slice: SqliteAddressStore) -> None:
        assert full_slice.by_id("linz-slice-1") is not None
        assert full_slice.by_id("linz-not-here") is None

    def test_the_slice_feeds_the_engine(self, full_slice: SqliteAddressStore) -> None:
        result = AddressCorrector(full_slice).correct("16a Dundee Place, Linwood")

        assert result.corrected == "27/16A Dundee Pl Linwood Christchurch"
        assert result.linz_address_id == "linz-slice-1"
        assert result.needs_question is False


class TestNormalisationHelpers:
    def test_similarity_of_an_empty_name_is_zero(self) -> None:
        assert similarity("", "main north rd") == 0.0
        assert similarity("main north rd", "") == 0.0

    def test_identical_names_score_one(self) -> None:
        assert similarity("main north rd", "main north rd") == 1.0

    def test_a_missing_number_is_not_an_int(self) -> None:
        assert _as_int(None) is None

    def test_a_unit_the_candidates_do_not_have_keeps_them_all(self) -> None:
        candidates = [
            Address("linz-a", "16", "Dundee Pl", "Linwood", unit="2"),
            Address("linz-b", "16", "Dundee Pl", "Linwood"),
        ]

        assert _prefer_plain_address(candidates, "9") == candidates


class TestExtendedRoadName:
    """The street type can be part of the road name ("Durham Street South").

    `nz_address.parse` renders a spoken street with the short type ("Durham
    St"), so the store holds the road names the way the committed fixture
    does: in the short form of the street type.
    """

    DURHAM = [
        Address("linz-durham-22", "22", "Durham St", "Sydenham", town="Christchurch"),
        Address("linz-durham-south-17", "17", "Durham St South", "Sydenham", town="Christchurch"),
    ]

    def test_reads_the_direction_as_part_of_the_road(self) -> None:
        corrector = AddressCorrector(InMemoryAddressStore(self.DURHAM))

        result = corrector.correct("17 Durham Street South")

        assert result.corrected == "17 Durham St South Sydenham Christchurch"
        assert result.linz_address_id == "linz-durham-south-17"
        assert result.needs_question is False

    def test_a_road_whose_slice_is_missing_asks(self) -> None:
        class SliceWithoutAddresses(InMemoryAddressStore):
            def by_road(self, road: str) -> list[Address]:
                return []

        corrector = AddressCorrector(SliceWithoutAddresses(self.DURHAM))
        result = corrector.correct("17 Durham Street South")

        assert result.corrected is None
        assert result.reason == "no addresses known on 'Durham St South'"
        assert result.needs_question is True


class TestSuburbMatchingSteps:
    """The suburb is matched against the suburbs the road really runs through.

    The spoken suburb is first normalised by `nz_address.parse` (cutoff 0.75
    against the Christchurch list), so the corrector's own fuzzy step is
    reached with names the road does not serve: those are unit-tested here.
    """

    def test_a_likely_name_fuzzy_matches_the_road_suburb(
        self, corrector: AddressCorrector
    ) -> None:
        assert corrector._match_suburb("Papanu", ["Papanui", "Redwood"]) == "Papanui"

    def test_a_distant_name_does_not_match(self, corrector: AddressCorrector) -> None:
        assert corrector._match_suburb("Riccarton", ["Papanui", "Redwood"]) is None

    def test_the_hint_stands_when_the_road_has_no_suburbs(
        self, corrector: AddressCorrector
    ) -> None:
        assert corrector._match_suburb("Redwood", []) == "Redwood"


class TestCorrectionEdits:
    def test_a_unit_the_database_does_not_have_is_reported(
        self, corrector: AddressCorrector
    ) -> None:
        result = corrector.correct("2/140 Main North Rd, Papanui")

        assert result.corrected == "140 Main North Rd Papanui Christchurch"
        assert result.changes == ["unit 2 added"]
        assert result.needs_question is False

    def test_a_suffix_the_database_does_not_have_falls_to_the_number(
        self, corrector: AddressCorrector
    ) -> None:
        result = corrector.correct("140A Main North Rd, Papanui")

        assert result.corrected == "140 Main North Rd Papanui Christchurch"
        assert result.changes == ["suffix A matched 140"]
        assert result.reason == "house number found with a different suffix"

    def test_a_self_correction_without_a_new_number_is_ignored(
        self, corrector: AddressCorrector
    ) -> None:
        result = corrector.correct("22 Riccarton Rd, Riccarton, nope")

        assert result.corrected == "22 Riccarton Rd Riccarton Christchurch"

    def test_a_road_without_house_numbers_asks(self) -> None:
        store = InMemoryAddressStore(
            [Address("linz-quiet-1", "", "Quiet Creek Rd", "Taumutu", town="Christchurch")]
        )
        result = AddressCorrector(store).correct("26 Quiet Creek Rd")

        assert result.corrected is None
        assert result.reason == "no house numbers known on 'Quiet Creek Rd'"
        assert result.needs_question is True

