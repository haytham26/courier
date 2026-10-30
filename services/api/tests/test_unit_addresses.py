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
    """R23's rule: `unit 255C` is unit 255 with suffix C - the form that must keep
    splitting, because it is the one where the letter is a suffix and not part of
    the unit's name."""
    parsed = parse("unit 255C 28 Cathedral Square Christchurch Central Christchurch", SUBURBS)

    assert parsed.unit == "255"
    assert parsed.number == "28"
    assert parsed.suffix == "C"


def test_a_number_with_a_suffix_still_parses() -> None:
    """R23's other rule, which the same code path serves: `42B` is 42 with
    suffix B."""
    parsed = parse("42B Smith Street Christchurch Central Christchurch", SUBURBS)

    assert parsed.number == "42"
    assert parsed.suffix == "B"
