from app.sequencing import Segment, Stop, sequence


def test_template_lock_order():
    stops = [Stop("a", "redwood:b st", 5, 0, 0), Stop("b", "redwood:a st", 9, 0, 0),
             Stop("c", "redwood:a st", 2, 0, 0), Stop("d", "redwood:a st", 3, 0, 0)]
    out = sequence(stops, [Segment("redwood:a st", "odd_first"), Segment("redwood:b st")])
    assert [s.location_id for s in out] == ["d", "b", "c", "a"]
