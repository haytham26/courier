"""C3's parser slice: a number word in a road's name is not a house number.

The LINZ accuracy report (`docs/evidence/phase-2.3/linz-accuracy.md`) prints:

    [christchurch] spoken: None != '928 Two Chain Road Swannanoe Swannanoe'

`Two Chain Road` is the road's own name — "two" is one of its words, not the house
number the courier read out. `_words_to_digits` walked the whole string and turned
it into `2 Chain Road`, so the parser looked for a road called "2 Chain Rd", found
none, and answered with a suburb taken from the road's own name instead.
"""

from __future__ import annotations

from app.nz_address import parse

SUBURBS = ["Swannanoe", "Christchurch Central", "Bishopdale", "Papanui"]


def test_a_number_word_in_a_road_name_stays_a_word() -> None:
    """`928 Two Chain Road Swannanoe` keeps the road's name and finds the suburb.
    """
    parsed = parse("928 Two Chain Road Swannanoe", SUBURBS)

    assert parsed.number == "928"
    assert parsed.street == "Two Chain Rd"
    assert parsed.suburb == "Swannanoe"
    assert parsed.complete


def test_the_spoken_number_at_the_head_still_becomes_digits() -> None:
    """The existing contract, which must not move: a number the driver reads at the
    head becomes digits ("one four two" -> 142)."""
    parsed = parse("one four two Riccarton road rick a ton", SUBURBS)

    assert parsed.number == "142"


def test_the_spoken_whole_number_at_the_head_still_becomes_digits() -> None:
    """`forty two` -> 42, the other existing contract."""
    parsed = parse("forty two B main north road papa newey", SUBURBS)

    assert parsed.number == "42"
    assert parsed.suffix == "B"
