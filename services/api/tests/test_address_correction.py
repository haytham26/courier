"""Tests for the D8 address correction engine.

Contract (FINAL_PROMPT §0-F.3.3): every result is
``{original, corrected, reason, confidence, needs_question, options[]}``.

The fixture holds real Christchurch streets and suburbs. The LINZ ids are
placeholders (`fixture-chch-...`) until the founder provides the real LINZ
export in `data/linz/` (see `docs/status/FOUNDER_TODO.md`).
"""
from __future__ import annotations

from pathlib import Path

import pytest

from app.address_correction import (
    AddressCorrector,
    InMemoryAddressStore,
    road_key,
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
