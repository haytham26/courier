"""The driving-safe rules.

The eight word rule, the rule that the voice never asks for a touch of the
screen while the van is moving, the quiet mode, the essentials mode and the
calls on the phone.
"""

from __future__ import annotations

from app.models import AudioFocus, Verbosity
from app.safety import (
    MAX_WORDS_WHILE_MOVING,
    apply_safety,
    demands_a_tap,
    enforce_word_limit,
    is_moving,
    quiet_reply,
    real_word_count,
    strip_screen_demands,
    tidy,
    word_count,
)


def test_the_word_limit_is_eight():
    assert MAX_WORDS_WHILE_MOVING == 8


def test_the_van_is_moving_above_fifteen_kilometres():
    assert is_moving(0) is False
    assert is_moving(15) is False
    assert is_moving(42) is True


def test_a_line_is_cut_to_the_limit():
    long_line = "You have eight stops left and the rain starts after two o'clock"
    assert word_count(long_line) > MAX_WORDS_WHILE_MOVING
    assert word_count(enforce_word_limit(long_line)) == MAX_WORDS_WHILE_MOVING


def test_a_short_line_is_left_alone():
    assert enforce_word_limit("Eight stops left.") == "Eight stops left."


def test_the_line_is_cut_at_a_clause_first():
    line = "Eight stops left, and the rain starts after two o'clock."
    assert enforce_word_limit(line) == "Eight stops left"


def test_a_tap_demand_is_recognised():
    assert demands_a_tap("Tap the next stop on the screen") is True
    assert demands_a_tap("Swipe to the next stop") is True
    assert demands_a_tap("Eight stops left") is False


def test_the_tap_demand_is_taken_out():
    line = "Tap the next stop. Eight stops left."
    assert demands_a_tap(strip_screen_demands(line)) is False
    assert "Eight stops left" in strip_screen_demands(line)


def test_a_reply_while_moving_keeps_to_eight_words():
    outcome = apply_safety(
        "You have eight stops left and the rain starts after two o'clock",
        moving=True,
    )
    assert word_count(outcome.speech) <= MAX_WORDS_WHILE_MOVING


def test_a_reply_while_moving_never_asks_for_a_tap():
    outcome = apply_safety("Tap the next stop on the screen to carry on", moving=True)
    assert demands_a_tap(outcome.speech) is False


def test_a_reply_while_parked_may_be_longer():
    line = "You have eight stops left and the rain starts after two o'clock."
    outcome = apply_safety(line, moving=False)
    assert outcome.speech == line


def test_the_quiet_mode_says_nothing_but_the_essentials():
    outcome = apply_safety("How is the day going?", moving=False, quiet_mode=True)
    assert outcome.speech == ""
    assert outcome.suppressed is True
    assert outcome.reason == "quiet_mode"


def test_the_quiet_mode_lets_the_essentials_through():
    outcome = apply_safety(
        "Delivered.", moving=False, quiet_mode=True, essential=True
    )
    assert outcome.speech == "Delivered."


def test_the_essentials_mode_keeps_the_reply_short():
    outcome = apply_safety(
        "You have eight stops left and the rain starts after two o'clock",
        moving=False,
        essentials_only=True,
    )
    assert word_count(outcome.speech) <= MAX_WORDS_WHILE_MOVING


def test_a_call_on_the_phone_wins_over_the_voice():
    outcome = apply_safety("Eight stops left.", moving=False, audio_focus=AudioFocus.CALL)
    assert outcome.speech == ""
    assert outcome.suppressed is True
    assert outcome.reason == "a_call_is_on"


def test_the_music_makes_the_voice_wait():
    outcome = apply_safety("Eight stops left.", moving=False, audio_focus=AudioFocus.MUSIC)
    assert outcome.priority == "queue"


def test_the_navigation_makes_the_voice_wait():
    outcome = apply_safety(
        "Eight stops left.", moving=False, audio_focus=AudioFocus.NAVIGATION
    )
    assert outcome.priority == "queue"


def test_the_voice_speaks_at_once_when_nothing_else_is_going_on():
    outcome = apply_safety("Eight stops left.", moving=False, audio_focus=AudioFocus.NORMAL)
    assert outcome.priority == "now"


def test_the_minimal_verbosity_keeps_it_to_six_words():
    outcome = apply_safety(
        "You have eight stops left and the rain starts after two o'clock",
        moving=False,
        verbosity=Verbosity.MINIMAL,
    )
    assert word_count(outcome.speech) <= 6


def test_the_line_has_no_double_spaces_or_stray_punctuation():
    outcome = apply_safety("  Eight   stops left.  ", moving=False)
    assert outcome.speech == "Eight stops left."


class TestTheCountersAndTheCleaners:
    """The exact outputs of the word counters and the line cleaners (BUG-244:
    the mutation floor's survivors here were the regexes and the strip()
    sets of `word_count`, `real_word_count`, `strip_screen_demands` and
    `tidy` - the earlier tests read the outcomes of `apply_safety`, which
    swallows the difference)."""

    def test_word_count_ignores_punctuation_and_keeps_hyphenated_pairs(self):
        assert word_count("Delivered at 57 Poulson Street, Addington.") == 6
        assert word_count("mid-rack, 42B") == 2
        assert word_count("") == 0
        # a standalone punctuation mark is not a word - only the regex that
        # strips it makes "yes . no" two words, not three
        assert word_count("yes . no") == 2

    def test_real_word_count_skips_the_fillers(self):
        assert real_word_count("mm, uh, delivered") == 1
        assert real_word_count("Delivered!") == 1
        assert real_word_count("mm uh") == 0
        # the filler is still a filler with punctuation on it, and in caps
        assert real_word_count("uh!") == 0
        assert real_word_count("MM") == 0

    def test_strip_screen_demands_takes_the_tap_sentence_out(self):
        assert strip_screen_demands("Delivered. Tap the screen to confirm.") == "Delivered."
        assert strip_screen_demands("tap the screen") == ""
        assert strip_screen_demands("Delivered.") == "Delivered."
        # two kept sentences: the join separator is what puts the space back
        assert (
            strip_screen_demands("Delivered. Next is Kowhai Street. Tap the screen.")
            == "Delivered. Next is Kowhai Street."
        )

    def test_tidy_removes_space_before_punctuation_and_doubled_punctuation(self):
        assert tidy("Delivered .  Yes !!") == "Delivered. Yes!"
        assert tidy("  Eight   stops left.  ") == "Eight stops left."

    def test_quiet_reply_is_the_tidy_limited_line_without_the_demands(self):
        assert (
            quiet_reply("Delivered at 57 Poulson Street, Addington. Tap the screen to confirm.")
            == "Delivered at 57 Poulson Street, Addington."
        )
