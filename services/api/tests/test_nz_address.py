from app import nz_address


def test_parse_spoken_address():
    p = nz_address.parse("forty two B main north road papa newey")
    # R23: "42B" is number 42 with suffix B; a unit is always written "2/14".
    assert (p.unit, p.number, p.suffix, p.street, p.suburb) == (
        None,
        "42",
        "B",
        "Main North Rd",
        "Papanui",
    )


def test_parse_unit_slash_is_a_unit_not_a_suffix():
    p = nz_address.parse("2/14 Harewood Rd, Bishopdale")
    assert (p.unit, p.number, p.suffix) == ("2", "14", None)


def test_parse_unit_slash_and_digits():
    p = nz_address.parse("2/14 Harewood Rd, Bishopdale")
    assert (p.unit, p.number, p.suburb) == ("2", "14", "Bishopdale")
    assert nz_address.parse("one four two Riccarton road rick a ton").number == "142"


def test_incomplete_address():
    assert not nz_address.parse("Smith Street").complete
