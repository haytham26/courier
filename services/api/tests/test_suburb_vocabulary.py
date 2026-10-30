"""C3's fourth parser slice: the register's own suburb vocabulary, and the
spoken house number that follows a unit.

Every failure quoted here is printed by the measurement this file was written
against (`docs/evidence/phase-2.3/linz-accuracy.md`, the 2026-10-30 re-measure
over 656 392 real LINZ addresses, 85.2 % (1534/1800)):

* `canonical: None != '24 Dublin Street Christchurch Central Christchurch'` —
  and 150 more like it, every one of them the reason
  `'<road>' runs through several suburbs`. The driver NAMED the suburb; the
  parser only recognises the 45 suburbs of `nz_address.CHCH_SUBURBS`, so
  `Christchurch Central`, `Lyttelton`, `Prebbleton`, `Rolleston`, `Lincoln`,
  `Kaiapoi` and `Diamond Harbour` are all invisible to it. The tail after the
  street type is therefore thrown away instead of being handed to the engine,
  which already knows how to match a hint against the suburbs a road really
  runs through (`AddressCorrector._match_suburb`) — it is simply never given
  one. 31 % of the register's addresses sit on a road that spans more than one
  suburb, so this one defect is the majority of the loss.

* `spoken: None != '1/7 Michelle Road Wigram Christchurch'` and 40 more — the
  house number is spoken as words AFTER the unit (`unit 1 seven ...`,
  `unit 6 fifty seven ...`), and `_words_to_digits` only converts a LEADING run
  of number words: once `unit` has been emitted, every later number word stays
  a word, so the engine looks for house number "seven".

* `canonical: None != "19 O'Leary Street Hoon Hay Christchurch"` — the
  spoken-suffix heuristic (`^(\\d+) ([a-z])\\b`) fires on a road whose name
  starts with a letter, gluing the number to the name ("19o'Leary St").

The fix is the vocabulary: the store is the authority on which suburbs exist
(`AddressStore.suburbs()`), and the parser is given it. One test per class, all
of them red before the fix and green after it.
"""

from __future__ import annotations

from app.address_correction import Address, AddressCorrector, InMemoryAddressStore
from app.nz_address import parse

# The register's own vocabulary for these roads, as the three areas really
# carry it. Christchurch Central is NOT in `nz_address.CHCH_SUBURBS`, and
# neither is Prebbleton: that is the defect under test.
REGISTER_SUBURBS = [
    "Christchurch Central",
    "Lyttelton",
    "Merivale",
    "Wigram",
    "Prebbleton",
    "Hoon Hay",
    "Swannanoa",
]

SUBURBS = [
    Address(linz_address_id="219309", number="24", road="Dublin Street",
            suburb="Christchurch Central", town="Christchurch"),
    Address(linz_address_id="219842", number="9", road="Dublin Street",
            suburb="Christchurch Central", town="Christchurch"),
    Address(linz_address_id="300001", number="4", road="Dublin Street",
            suburb="Lyttelton", town="Lyttelton"),
    Address(linz_address_id="300002", number="6", road="Dublin Street",
            suburb="Merivale", town="Christchurch"),
    Address(linz_address_id="400001", unit="1", number="7", road="Michelle Road",
            suburb="Wigram", town="Christchurch"),
    Address(linz_address_id="400002", unit="6", number="57", road="Matipo Street",
            suburb="Riccarton", town="Christchurch"),
    Address(linz_address_id="500001", number="2", road="Skara Brae",
            suburb="Prebbleton", town="Prebbleton"),
    Address(linz_address_id="600001", number="19", road="O'Leary Street",
            suburb="Hoon Hay", town="Christchurch"),
]


def store() -> InMemoryAddressStore:
    return InMemoryAddressStore(SUBURBS)


def corrector() -> AddressCorrector:
    return AddressCorrector(store())


# ---------------------------------------------------------------------------
# The named suburb is the answer, not a question
# ---------------------------------------------------------------------------


def test_a_suburb_the_driver_named_is_never_asked_about() -> None:
    """'24 Dublin Street, Christchurch Central' is answered, not queried."""
    result = corrector().correct("24 Dublin Street, Christchurch Central")

    assert result.corrected == "24 Dublin Street Christchurch Central Christchurch"
    assert result.needs_question is False, f"the engine asked: {result.options}"


def test_the_spoken_form_answers_with_the_named_suburb() -> None:
    result = corrector().correct("twenty four Dublin Street Christchurch Central")

    assert result.corrected == "24 Dublin Street Christchurch Central Christchurch"
    assert result.needs_question is False


def test_the_subquestion_is_asked_only_when_no_suburb_is_named() -> None:
    """The question is still right when the driver really did not say it."""
    result = corrector().correct("24 Dublin Street")

    assert result.corrected is None
    assert result.needs_question is True
    # The options are the register's suburbs for that road, so the driver can
    # answer out loud.
    assert result.options == ["Christchurch Central", "Lyttelton", "Merivale"]


def test_a_suburb_the_hardcoded_list_does_not_know_is_taken_from_the_register() -> None:
    """Prebbleton is not in `CHCH_SUBURBS`; the store knows it.

    '2 Skara Brae, Prebbleton' used to parse the whole tail as the road
    ('Skara Brae Prebbleton') and answer "no known street called ...".
    """
    parsed = parse("2 Skara Brae, Prebbleton", REGISTER_SUBURBS)

    assert parsed.number == "2"
    assert parsed.street == "Skara Brae"
    assert parsed.suburb == "Prebbleton"
    assert parsed.suburb_hint == "prebbleton"


def test_the_engine_takes_that_suburb_from_the_store_too() -> None:
    result = corrector().correct("2 Skara Brae, Prebbleton")

    assert result.corrected == "2 Skara Brae Prebbleton Prebbleton"
    assert result.needs_question is False


def test_the_town_the_driver_repeats_does_not_defeat_the_match() -> None:
    """A courier says '... Christchurch Central Christchurch' (the city again)."""
    parsed = parse("24 Dublin Street, Christchurch Central, Christchurch", REGISTER_SUBURBS)

    assert parsed.suburb == "Christchurch Central"
    assert result_is_complete(parsed)


def result_is_complete(parsed) -> bool:  # noqa: ANN001 - a ParsedAddress
    return bool(parsed.number and parsed.street and parsed.suburb)


# ---------------------------------------------------------------------------
# The spoken house number after the unit
# ---------------------------------------------------------------------------


def test_a_spoken_number_after_the_unit_is_the_house_number() -> None:
    """'unit 1 seven Michelle Road Wigram' is 1/7, not house number 'seven'."""
    parsed = parse("unit 1 seven Michelle Road Wigram", REGISTER_SUBURBS)

    assert parsed.unit == "1"
    assert parsed.number == "7"
    assert parsed.street == "Michelle Rd"


def test_a_multiword_spoken_number_after_the_unit_is_the_house_number() -> None:
    """'unit 6 fifty seven Matipo Street Riccarton' is 6/57.

    The old parse read the number as 'fifty' and moved 'Seven' onto the road
    ('no known street called 'Seven Matipo St'').
    """
    parsed = parse("unit 6 fifty seven Matipo Street Riccarton", REGISTER_SUBURBS)

    assert parsed.unit == "6"
    assert parsed.number == "57"
    assert parsed.street == "Matipo St"


def test_the_engine_answers_those_addresses() -> None:
    first = corrector().correct("unit 1 seven Michelle Road Wigram")
    assert first.corrected == "1/7 Michelle Road Wigram Christchurch"
    assert first.needs_question is False

    second = corrector().correct("unit 6 fifty seven Matipo Street Riccarton")
    assert second.corrected == "6/57 Matipo Street Riccarton Christchurch"
    assert second.needs_question is False


# ---------------------------------------------------------------------------
# A road name that starts with a letter after the number
# ---------------------------------------------------------------------------


def test_a_road_whose_name_starts_with_a_letter_keeps_its_number() -> None:
    """"19 O'Leary Street, Hoon Hay" was read as house number None."""
    parsed = parse("19 O'Leary Street, Hoon Hay", REGISTER_SUBURBS)

    assert parsed.number == "19"
    assert parsed.street == "O'Leary St"
    assert parsed.suburb == "Hoon Hay"


def test_the_spoken_suffix_still_works() -> None:
    """The heuristic this replaces has to keep working: '20 B McBratneys Road'.

    The road name is normalised through `str.title()`, which lowercases the
    "Mc" of a Scottish name; that casing never reaches the driver, because the
    answer's road name is the store's, matched by road key. What this test pins
    is the part that decides the answer: the number and the suffix survive.
    """
    parsed = parse("20 B McBratneys Road, Tai Tapu", REGISTER_SUBURBS)

    assert parsed.number == "20"
    assert parsed.suffix == "B"
    assert parsed.street is not None
    assert parsed.street.lower() == "mcbratneys rd"


def test_the_road_s_own_number_word_is_not_the_house_number() -> None:
    """The C3 third slice is not undone: '928 Two Chain Road' keeps its name."""
    parsed = parse("928 Two Chain Road Swannanoa", REGISTER_SUBURBS)

    assert parsed.number == "928"
    assert parsed.street == "Two Chain Rd"
    assert parsed.suburb == "Swannanoa"
