"""C3's parser slice: a road's direction word before the suburb.

The LINZ accuracy report (`docs/evidence/phase-2.3/linz-accuracy.md`) prints:

    [christchurch] canonical: None != '193 Durham Street South Christchurch Central Christchurch'

`South` is the direction of Durham Street, spoken after the road's type; the
suburb that follows it is `Christchurch Central`, repeated with the city's name as
a courier says it. The parser handed the whole tail — `south christchurch central
christchurch` — to the suburb matcher, which found no match, so the answer carried
no suburb and was not complete.
"""

from __future__ import annotations

from app.nz_address import parse

SUBURBS = [
    "Christchurch Central",
    "South Christchurch",
    "Somerfield",
    "Aidanfield",
    "Casebrook",
    "Riccarton",
]


def test_a_direction_word_does_not_steal_the_suburb() -> None:
    """`193 Durham Street South Christchurch Central Christchurch` answers with
    `Christchurch Central`, with `South` left where the driver said it."""
    parsed = parse("193 Durham Street South Christchurch Central Christchurch", SUBURBS)

    assert parsed.number == "193"
    # The road keeps its direction word, because that is what the driver said and
    # what the register's road name carries.
    assert parsed.street == "Durham St South"
    assert parsed.suburb == "Christchurch Central"
    assert parsed.complete


def test_the_short_form_is_ambiguous_and_the_test_says_so() -> None:
    """The short form is genuinely ambiguous, and this test says so rather than
    picking a side.

    `193 Durham Street South Christchurch` can be read two ways, and both are
    real: `South` is the direction of Durham Street, and `South Christchurch` is
    a Christchurch suburb. The parser resolves it through its fuzzy matcher,
    which cannot be told which is meant without the register's road data — so
    asserting either reading here would be a guess dressed as a test. What is
    asserted instead is that the answer stays complete and that the number and
    the road survive either resolution.
    """
    parsed = parse("193 Durham Street South Christchurch", SUBURBS)

    assert parsed.number == "193"
    assert parsed.street is not None and parsed.street.startswith("Durham St")
    assert parsed.suburb is not None, "either reading still has to name a suburb"
    assert parsed.complete, "a complete address either way is the floor"


def test_a_direction_word_is_kept_on_the_road_when_it_is_a_direction() -> None:
    """The unambiguous case: the road carries its direction, and the suburb that
    follows is named."""
    parsed = parse("193 Durham Street South Christchurch Central", SUBURBS)

    assert parsed.street == "Durham St South"
    assert parsed.suburb == "Christchurch Central"


def test_a_road_without_a_direction_is_untouched() -> None:
    """The regression guard: a road with no direction word answers as before."""
    parsed = parse("193 Durham Street Christchurch Central Christchurch", SUBURBS)

    assert parsed.street == "Durham St"
    assert parsed.suburb == "Christchurch Central"
    assert parsed.complete
