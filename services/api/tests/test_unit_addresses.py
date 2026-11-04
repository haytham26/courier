"""C3's parser slice: a unit that carries a letter, before a slash.

The LINZ accuracy report (`docs/evidence/phase-2.3/linz-accuracy.md`) names these
as real failures against 656,044 real addresses:

    [christchurch] canonical: None != '255C/28 Cathedral Square Christchurch Central Christchurch'
    [waimakariri] canonical: '87 Kilmore Street Christchurch Central Christchurch'
                        != '4D/87 Kilmore Street Christchurch Central Christchurch'

`255C/28` is unit 255C at number 28; `4D/87` is flat 4D at 87. The parser read the
first as unit 255 + suffix C (so the answer key was `255/28 ...` with a stray C on
the number) and the second as unit 4 + suffix D, and it did not parse `D/87` at
all. Every check that reads a unit address shipped wrong, and the unit is what the
phone shows the courier at the door.
"""

from __future__ import annotations

from app.address_correction import Address, AddressCorrector, InMemoryAddressStore
from app.nz_address import parse

SUBURBS = [
    "Christchurch Central",
    "Somerfield",
    "Casebrook",
    "Russley",
    "Bromley",
    "Swannanoe",
    "Kaiapoi",
    "Halswell",
    "Kirwee",
]


def test_a_unit_with_a_letter_before_the_slash_stays_whole() -> None:
    """`255C/28` is unit 255C, number 28 - not unit 255 with a suffix C.

    The unit is asserted lower-case because that is the parser's own contract:
    `parse` lower-cases the text it is given (the roads and suburbs are matched
    case-insensitively too) and `address_key` is lower-cased. The suffix, a
    single letter the driver *says*, is the one thing the parser upper-cases.
    """
    parsed = parse("255C/28 Cathedral Square Christchurch Central Christchurch", SUBURBS)

    assert parsed.unit == "255c"
    assert parsed.number == "28"
    assert parsed.suffix is None
    # The answer key is what the engine matches, so the unit's shape in it is
    # the whole claim: "255c/28", not "255/28" with the C moved onto the number.
    assert parsed.address_key.startswith("255c/28 ")


def test_a_flat_with_a_letter_before_the_slash_stays_whole() -> None:
    """`4D/87` is flat 4D at 87, not unit 4 with a suffix D."""
    parsed = parse("4D/87 Kilmore Street Christchurch Central Christchurch", SUBURBS)

    assert parsed.unit == "4d"
    assert parsed.number == "87"
    assert parsed.suffix is None
    assert parsed.address_key.startswith("4d/87 ")


def test_a_unit_of_letters_only_parses() -> None:
    """`D/87` is unit d at 87 - the letter-only unit did not parse at all."""
    parsed = parse("D/87 Kilmore Street Christchurch Central Christchurch", SUBURBS)

    assert parsed.unit == "d"
    assert parsed.number == "87"
    assert parsed.suffix is None
    assert parsed.address_key.startswith("d/87 ")


def test_the_digits_only_unit_still_parses() -> None:
    """`2/14` is unit 2 at 14, the form the parser already had right."""
    parsed = parse("2/14 Smith Street Christchurch Central Christchurch", SUBURBS)

    assert parsed.unit == "2"
    assert parsed.number == "14"
    assert parsed.suffix is None
    assert parsed.address_key.startswith("2/14 ")


def test_the_spoken_unit_form_is_not_regressed() -> None:
    """R23's rule, corrected against the register: a SPOKEN unit keeps its letter.

    This test pinned the other reading (`unit 255C` as unit 255 with suffix C),
    and the LINZ accuracy report is what proved it wrong: the real rows carry
    units like `287C` and `GB`, so splitting `287C` into 287 + suffix C made the
    suffix match the PLAIN 28C row in the store and the answer came back as
    `28C Cathedral Square` with an invented "unit 287 added" change - 22 of the
    56 failures in the 1800-check sample (the unit family, the largest of them
    all). A spoken unit is a unit's name, exactly as the slash form already
    was; a letter on a house number is a suffix, and it is split only when it is
    NOT the unit's (R23's `42B`, below, still passes).
    """
    parsed = parse("unit 255C 28 Cathedral Square Christchurch Central Christchurch", SUBURBS)

    assert parsed.unit == "255c"
    assert parsed.number == "28"
    assert parsed.suffix is None


def test_the_spoken_unit_of_letters_keeps_its_name() -> None:
    """`unit GB 87 Kilmore Street` is flat GB at 87 - the letter-only unit."""
    parsed = parse("unit GB 87 Kilmore Street Christchurch Central Christchurch", SUBURBS)

    assert parsed.unit == "gb"
    assert parsed.number == "87"
    assert parsed.suffix is None


def test_a_number_with_a_suffix_still_parses() -> None:
    """R23's other rule, which the same code path serves: `42B` is 42 with
    suffix B."""
    parsed = parse("42B Smith Street Christchurch Central Christchurch", SUBURBS)

    assert parsed.number == "42"
    assert parsed.suffix == "B"


class TestTheSpokenUnitAgainstThePlainRow:
    """The failure the accuracy report named, end to end (C3).

    The store holds BOTH the unit row (287C/28) and a plain row (28C): the
    split rule read `unit 287C 28` as unit 287 with suffix C, the suffix then
    matched the plain row, and the answer came back `28C Cathedral Square`
    with a "unit 287 added" change that invented a fact. The spoken unit keeps
    its name, so the answer is the row the driver said.
    """

    def test_the_unit_row_wins_over_the_plain_one(self) -> None:
        store = InMemoryAddressStore(
            [
                Address("linz-unit-1", "28", "Cathedral Square", "Christchurch Central", unit="287C"),
                Address("linz-plain-1", "28", "Cathedral Square", "Christchurch Central", suffix="C"),
            ]
        )
        corrector = AddressCorrector(store)

        result = corrector.correct("unit 287C 28 Cathedral Square Christchurch Central")

        assert result.corrected == "287C/28 Cathedral Square Christchurch Central"
        assert result.changes == []

    def test_the_unit_row_is_matched_regardless_of_the_case_linz_published(self) -> None:
        """The register writes its units as LINZ published them ("287C", "GB"),
        and the parser hands its own lower-case ("287c"): a unit address must not
        be missed because the two cases disagree - which is what the accuracy
        report's unit family measured ('28 Cathedral Square' answered for the
        gold '287C/28', with the unit row sitting right beside the plain row).
        """
        store = InMemoryAddressStore(
            [
                Address("linz-unit-3", "87", "Kilmore Street", "Christchurch Central", unit="GB"),
                Address("linz-plain-3", "87", "Kilmore Street", "Christchurch Central"),
            ]
        )
        corrector = AddressCorrector(store)

        result = corrector.correct("unit GB 87 Kilmore Street Christchurch Central")

        assert result.corrected == "GB/87 Kilmore Street Christchurch Central"
        assert result.changes == []

    def test_the_letter_only_unit_row_wins_over_the_plain_one(self) -> None:
        store = InMemoryAddressStore(
            [
                Address("linz-unit-2", "87", "Kilmore Street", "Christchurch Central", unit="GB"),
            ]
        )
        corrector = AddressCorrector(store)

        result = corrector.correct("unit GB 87 Kilmore Street Christchurch Central")

        assert result.corrected == "GB/87 Kilmore Street Christchurch Central"
