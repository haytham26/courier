"""The directive-2026-11-08 item 2 root fixes, one test per error class.

Every class here is named in the tune-set error analysis
(`docs/evidence/phase-2.3/linz-errors-tune.md`, 2026-11-08: 91 misses / 6000
checks on the 80 % tune streets):

- multi-type road names: "86 Lake Terrace Road, Burwood" split at "terrace"
  and answered "no known street called 'Lake Tce'";
- a direction word that is really the suburb's first word: "1 Halsey Street,
  South New Brighton" answered with the road "Halsey St South", which does not
  exist (the road is "Halsey Street", the suburb "South New Brighton"), while
  "9 Ascot Avenue, North New Brighton" is the other reading (the road IS
  "Ascot Avenue North"). Only the register's road names can tell them apart,
  so the parser hands the engine both readings (`street_alt` / `hint_alt`);
- the self-correction marker eating a road's own name: "648 No 10 Road
  Swannanoa" was rewritten to "10" because "no" is a correction word;
- wrong road from a fuzzy match: "8 Harte Street, Woolston" answered "Hare
  Street, Ilam", "66 Oxford, Christchurch Central" answered "Oxford Street,
  Lyttelton". The fix keeps the 0.78 road bar and the 0.8 suburb bar and
  disambiguates WITH the suburb the driver named: a candidate road whose own
  suburbs answer the spoken tail beats a merely similar road.
"""

from __future__ import annotations

from app.address_correction import Address, AddressCorrector, InMemoryAddressStore
from app.nz_address import parse

SUBURBS = [
    "Burwood",
    "St Albans",
    "Swannanoa",
    "South New Brighton",
    "New Brighton",
    "Christchurch Central",
    "Lyttelton",
    "Sydenham",
    "Woolston",
    "Ilam",
]


# ---------------------------------------------------------------------------
# Multi-type road names
# ---------------------------------------------------------------------------


def test_a_road_name_with_two_type_words_keeps_both_words() -> None:
    """"86 Lake Terrace Road, Burwood" is the road "Lake Terrace Rd"."""
    parsed = parse("86 Lake Terrace Road, Burwood", SUBURBS)

    assert parsed.number == "86"
    assert parsed.street == "Lake Terrace Rd"
    assert parsed.suburb == "Burwood"


def test_a_suburb_that_starts_with_a_type_word_is_not_eaten() -> None:
    """"1 Foo Road, St Albans": the split stays at "road", not at "st"."""
    parsed = parse("1 Foo Road, St Albans", SUBURBS)

    assert parsed.street == "Foo Rd"
    assert parsed.suburb == "St Albans"


def test_a_multi_type_road_without_a_suburb_splits_at_its_own_type() -> None:
    parsed = parse("86 Lake Terrace Road", SUBURBS)

    assert parsed.street == "Lake Terrace Rd"


# ---------------------------------------------------------------------------
# Direction word: road or suburb?
# ---------------------------------------------------------------------------


def test_the_parser_hands_the_engine_both_readings_of_a_direction() -> None:
    parsed = parse("1 Halsey Street, South New Brighton", SUBURBS)

    assert parsed.street == "Halsey St South"
    assert parsed.street_alt == "Halsey St"
    assert parsed.suburb_hint == "new brighton"
    assert parsed.hint_alt == "south new brighton"


def test_the_engine_picks_the_reading_the_register_supports() -> None:
    """The road is "Halsey Street" and the suburb "South New Brighton"."""
    store = InMemoryAddressStore(
        [
            Address("h1", "1", "Halsey Street", "South New Brighton", town="Christchurch"),
        ]
    )
    result = AddressCorrector(store).correct("1 Halsey Street, South New Brighton")

    assert result.corrected == "1 Halsey Street South New Brighton Christchurch"
    assert result.needs_question is False


def test_the_engine_keeps_the_direction_on_the_road_when_that_road_exists() -> None:
    """The other reading: the road IS "Ascot Avenue North", the suburb "New Brighton"."""
    store = InMemoryAddressStore(
        [
            Address("a1", "9", "Ascot Avenue North", "New Brighton", town="Christchurch"),
        ]
    )
    result = AddressCorrector(store).correct("9 Ascot Avenue, North New Brighton")

    assert result.corrected == "9 Ascot Avenue North New Brighton Christchurch"
    assert result.needs_question is False


# ---------------------------------------------------------------------------
# The self-correction marker must not eat a road's own name
# ---------------------------------------------------------------------------


def test_a_road_called_no_10_road_is_not_a_self_correction() -> None:
    store = InMemoryAddressStore(
        [Address("n1", "648", "No 10 Road", "Swannanoa", town="Swannanoa")]
    )
    result = AddressCorrector(store).correct("648 No 10 Road, Swannanoa")

    assert result.corrected == "648 No 10 Road Swannanoa Swannanoa"
    assert result.needs_question is False


def test_a_real_self_correction_still_applies() -> None:
    store = InMemoryAddressStore(
        [
            Address("m1", "142", "Main North Road", "Papanui", town="Christchurch"),
            Address("m2", "7", "Main North Road", "Papanui", town="Christchurch"),
        ]
    )
    result = AddressCorrector(store).correct("7 Main North Rd, Papanui no sorry 142 Main North Rd")

    assert result.corrected == "142 Main North Road Papanui Christchurch"


# ---------------------------------------------------------------------------
# Wrong road from a fuzzy match: disambiguate with the spoken suburb
# ---------------------------------------------------------------------------


def test_the_spoken_suburb_picks_the_right_road_when_the_type_is_omitted() -> None:
    """"66 Oxford, Christchurch Central" is Oxford Terrace, not Oxford Street."""
    store = InMemoryAddressStore(
        [
            Address("o1", "66", "Oxford Street", "Lyttelton", town="Lyttelton"),
            Address("o2", "66", "Oxford Terrace", "Christchurch Central", town="Christchurch"),
        ]
    )
    result = AddressCorrector(store).correct("66 Oxford, Christchurch Central")

    assert result.corrected == "66 Oxford Terrace Christchurch Central Christchurch"
    assert result.needs_question is False


def test_the_spoken_suburb_picks_the_right_road_on_a_misspelling() -> None:
    """"115 uBrke Street, Sydenham" is Burke Street, not Brake Street."""
    store = InMemoryAddressStore(
        [
            Address("b1", "115", "Brake Street", "Ilam", town="Christchurch"),
            Address("b2", "115", "Burke Street", "Sydenham", town="Christchurch"),
        ]
    )
    result = AddressCorrector(store).correct("115 uBrke Street, Sydenham")

    assert result.corrected == "115 Burke Street Sydenham Christchurch"
    assert result.needs_question is False


def test_a_similar_road_in_the_named_suburb_wins_over_an_exact_key() -> None:
    """"16 Bridle Path, Heathcote Valley": the road is "Bridle Path Road"."""
    store = InMemoryAddressStore(
        [
            Address("p1", "16", "Bridle Path", "Lyttelton", town="Lyttelton"),
            Address("p2", "16", "Bridle Path Road", "Heathcote Valley", town="Christchurch"),
        ]
    )
    result = AddressCorrector(store).correct("16 Bridle Path, Heathcote Valley")

    assert result.corrected == "16 Bridle Path Road Heathcote Valley Christchurch"
    assert result.needs_question is False


# ---------------------------------------------------------------------------
# The spoken number/unit breaks road-candidate ties
# ---------------------------------------------------------------------------


def test_the_shorter_road_wins_when_both_carry_the_number() -> None:
    """"368 Halswell, Halswell" is Halswell Road, not Halswell Junction Road."""
    store = InMemoryAddressStore(
        [
            Address("h1", "368", "Halswell Junction Road", "Halswell", town="Christchurch"),
            Address("h2", "368", "Halswell Road", "Halswell", town="Christchurch"),
        ]
    )
    result = AddressCorrector(store).correct("368 Halswell, Halswell")

    assert result.corrected == "368 Halswell Road Halswell Christchurch"
    assert result.needs_question is False


def test_the_unit_breaks_the_tie_between_two_completion_roads() -> None:
    """"unit 2 334 Halswell, Halswell" is 2/334 Halswell Road."""
    store = InMemoryAddressStore(
        [
            Address("h1", "334", "Halswell Junction Road", "Halswell", town="Christchurch"),
            Address("h2", "334", "Halswell Road", "Halswell", town="Christchurch", unit="2"),
        ]
    )
    result = AddressCorrector(store).correct("unit 2 334 Halswell, Halswell")

    assert result.corrected == "2/334 Halswell Road Halswell Christchurch"
    assert result.needs_question is False


def test_the_number_breaks_the_tie_between_two_similar_roads() -> None:
    """"55 iMlls Road, Marshland" is Mills Road (55 exists there, not on Hills Road)."""
    store = InMemoryAddressStore(
        [
            Address("m1", "12", "Hills Road", "Marshland", town="Christchurch"),
            Address("m2", "55", "Mills Road", "Marshland", town="Christchurch"),
        ]
    )
    result = AddressCorrector(store).correct("55 iMlls Road, Marshland")

    assert result.corrected == "55 Mills Road Marshland Christchurch"
    assert result.needs_question is False


def test_the_number_picks_the_completion_that_has_it() -> None:
    """"100 Peterborough, Christchurch Central" is Peterborough Street, not the Lane."""
    store = InMemoryAddressStore(
        [
            Address("p1", "1", "Peterborough Lane", "Christchurch Central", town="Christchurch"),
            Address("p2", "100", "Peterborough Street", "Christchurch Central", town="Christchurch"),
        ]
    )
    result = AddressCorrector(store).correct("100 Peterborough, Christchurch Central")

    assert result.corrected == "100 Peterborough Street Christchurch Central Christchurch"
    assert result.needs_question is False
