"""The offline brain on the sentences a courier actually says (BUG-187).

The A3 measurement read the set's own gold scripts through this parser and
found the address-bearing forms of the delivery language unparsed: the
catalogue held short commands ("delivered", "skip this one") and a courier
says "delivered at 57 Poulson Street, Addington". These tests pin the forms
and the slots the parser must answer, on the sentences the evaluation set
actually contains (the manifest's templates), plus the short forms that keep
working and the chatter that must stay a noop (M9's direction).
"""

from __future__ import annotations

import pytest

from app.models import (
    ReasoningReply,
    ReasoningRequest,
    RunContext,
    Stop,
    StopStatus,
    Verbosity,
    VoiceAction,
    VoiceSettings,
)
from app.offline_brain import (
    OFFLINE_LINES,
    _answer_of,
    _company_of,
    _dynamic_speech,
    _question_of_action,
    command_speech,
    offline_reason,
    parse_command,
)


class TestTheDeliveryForms:
    @pytest.mark.parametrize(
        ("sentence", "safe_place"),
        [
            ("delivered at 57 Poulson Street, Addington", None),
            ("left it on the porch at 19 Date Crescent, Aidanfield", "porch"),
            ("dropped it in the letterbox at 490 West Street, Allenton", "letterbox"),
            ("put it in the porch at 67 Westgrove Avenue, Avonhead", "porch"),
            ("left it with the neighbour at 33 A Darroch Street, Belfast", "neighbour"),
            ("left it under the mat at 70 Rakaia Terrace Road, Bankside", "under the mat"),
            ("handed it to the man at 12 Riccarton Road, Riccarton", "handed over"),
            ("left it at the shop counter at 1 Colombo Street, Christchurch Central", "shop counter"),
        ],
    )
    def test_a_delivery_with_its_address_is_the_command(self, sentence: str, safe_place: str | None) -> None:
        action = parse_command(sentence)
        assert action is not None, sentence
        assert action.type == "mark_delivered"
        assert action.safe_place == safe_place


class TestTheFailureForms:
    @pytest.mark.parametrize(
        ("sentence", "reason"),
        [
            ("no one home at 2212 Ashburton Staveley Road, Ashburton Forks", "no one home"),
            ("nobody answered at 12 Riccarton Road, Riccarton", "no one home"),
            ("cannot get in at 67 Westgrove Avenue, Avonhead", "can't get in"),
            ("locked out at 490 West Street, Allenton", "can't get in"),
            ("dog in the yard at 70 Rakaia Terrace Road, Bankside", "dog"),
        ],
    )
    def test_a_failure_names_its_reason(self, sentence: str, reason: str) -> None:
        action = parse_command(sentence)
        assert action is not None, sentence
        assert action.type == "mark_failed"
        assert action.reason == reason


class TestTheSkipForms:
    @pytest.mark.parametrize(
        "sentence",
        [
            "skip this one at 33 A Darroch Street, Belfast",
            "come back to 1790 Bayleys Road, Birdlings Flat later",
            "skip the street for 27 A Parnwell Street, Burwood",
        ],
    )
    def test_a_skip_with_its_address_is_the_command(self, sentence: str) -> None:
        action = parse_command(sentence)
        assert action is not None, sentence
        assert action.type == "skip_stop"


class TestTheBreakAndTheRepeatForms:
    def test_taking_a_break_opens_it(self) -> None:
        action = parse_command("taking a ten minute break")
        assert action is not None
        assert action.type == "start_break"
        assert action.minutes == 10

    def test_back_on_the_road_ends_it(self) -> None:
        action = parse_command("back on the road")
        assert action is not None
        assert action.type == "end_break"

    @pytest.mark.parametrize(
        "sentence",
        [
            "what was that",
            "repeat that",
            "where is it in the van",
            "read me the next one",
        ],
    )
    def test_a_repeat_is_the_command(self, sentence: str) -> None:
        action = parse_command(sentence)
        assert action is not None, sentence
        assert action.type == "repeat_or_detail"


class TestTheNoteForms:
    @pytest.mark.parametrize(
        ("sentence", "kind"),
        [
            ("gate code is one four two one at 6/149 Highsted Road, Casebrook", "gate code"),
            ("watch the dog at 19 Date Crescent, Aidanfield", "entry note"),
            ("parcel box round the back at 177 A Cashmere Road, Hoon Hay", "safe place"),
            ("side gate left of the garage at 60 A Princes Street, Netherby", "entry note"),
            ("the gate is on the Aitken Street side at 76 Aitken Street, Ashburton", "entry note"),
        ],
    )
    def test_a_note_is_saved_with_its_kind(self, sentence: str, kind: str) -> None:
        action = parse_command(sentence)
        assert action is not None, sentence
        assert action.type == "add_location_note"
        assert action.kind == kind
        assert action.text  # the spoken body, with the address left for the address engine


class TestTheAddForms:
    def test_an_add_with_its_address_keeps_it(self) -> None:
        action = parse_command("add a stop at 6/149 Highsted Road, Casebrook")
        assert action is not None
        assert action.type == "add_stop"
        assert action.raw_address == "6/149 Highsted Road, Casebrook"

    def test_a_priority_add_is_priority(self) -> None:
        action = parse_command("priority parcel for 12 Riccarton Road, Riccarton")
        assert action is not None
        assert action.type == "add_stop"
        assert action.priority is True

    def test_a_plain_add_is_not_priority(self) -> None:
        # The gold slot says so: the M3 bar counts the mandatory slots, and a
        # plain add that leaves priority empty is a slot the check reads wrong.
        action = parse_command("add a stop at 363 Harewood Road, Bishopdale")
        assert action is not None
        assert action.type == "add_stop"
        assert action.priority is False
        assert action.raw_address == "363 Harewood Road, Bishopdale"

    def test_an_add_on_the_way_back_keeps_the_address_only(self) -> None:
        action = parse_command("add 70 Rakaia Terrace Road, Bankside on the way back")
        assert action is not None
        assert action.raw_address == "70 Rakaia Terrace Road, Bankside"


class TestTheShortFormsKeepWorking:
    @pytest.mark.parametrize(
        ("sentence", "expected"),
        [
            ("delivered", "mark_delivered"),
            ("skip this one", "skip_stop"),
            ("failed", "mark_failed"),
            ("start a break", "start_break"),
            ("end break", "end_break"),
            ("repeat", "repeat_or_detail"),
            ("where am i", "where_am_i"),
            ("emergency", "emergency"),
        ],
    )
    def test_the_short_command_is_unchanged(self, sentence: str, expected: str) -> None:
        action = parse_command(sentence)
        assert action is not None, sentence
        assert action.type == expected

    def test_the_place_of_a_short_delivery_is_kept(self) -> None:
        action = parse_command("left it on the porch")
        assert action is not None
        assert action.safe_place == "porch"


class TestTheChatterStaysQuiet:
    @pytest.mark.parametrize(
        "sentence",
        [
            "the coffee is cold",
            "is the traffic on Blenheim still silly",
            "she said she would be home at five",
            "can you turn the radio down",
            "radio says the road is closed",
        ],
    )
    def test_conversation_is_not_a_command(self, sentence: str) -> None:
        assert parse_command(sentence) is None


class TestTheWholeReply:
    def test_the_offline_reason_answers_the_delivery_with_its_speech(self) -> None:
        request = ReasoningRequest(transcript="delivered at 57 Poulson Street, Addington")
        reply = offline_reason(request)
        assert reply.action is not None
        assert reply.action.type == "mark_delivered"
        assert reply.speech

    def test_the_command_speech_is_the_line_the_voice_says(self) -> None:
        assert command_speech("delivered at 57 Poulson Street, Addington") == "Delivered."


def a_day() -> RunContext:
    """A day in the middle: one stop delivered, one active, two pending."""
    return RunContext(
        stops=(
            Stop(id="s1", sequence=1, number="42", street="Main North Road", status=StopStatus.DELIVERED),
            Stop(id="s2", sequence=2, number="14", street="Harewood", status=StopStatus.ACTIVE),
            Stop(id="s3", sequence=3, number="3", street="Kowhai Street", status=StopStatus.PENDING),
            Stop(id="s4", sequence=4, number="9", street="Rimu Street", status=StopStatus.PENDING),
        ),
    )


class TestTheReplyContract:
    """The offline brain's replies pin their WHOLE ReasoningReply - speech,
    action, source, engine and question - not just the speech.

    BUG-244: the mutation floor's survivors here were the `source=`/`engine=`/
    `question=` kwargs and the empty-speech fallbacks of `_answer_of` and
    `_company_of` (64 mutants in run 42350269397) - the existing tests asserted
    only `reply.speech` or `reply.action`, so those mutants survived.
    """

    def test_a_question_about_the_run_answers_with_its_whole_reply(self) -> None:
        reply = offline_reason(ReasoningRequest(transcript="how many left?", context=a_day()))
        assert reply == ReasoningReply(
            speech="3 stops left.",
            action=VoiceAction(type="how_many_left"),
            source="on-device",
            engine="on-device",
            question="how_many_left",
        )

    def test_where_am_i_at_a_stop(self) -> None:
        reply = offline_reason(ReasoningRequest(transcript="where am I", context=a_day()))
        assert reply == ReasoningReply(
            speech="you're at 14 Harewood.",
            action=VoiceAction(type="where_am_i"),
            source="on-device",
            engine="on-device",
            question="where_am_i",
        )

    def test_where_am_i_between_stops(self) -> None:
        reply = offline_reason(ReasoningRequest(transcript="where am I", context=RunContext()))
        assert reply == ReasoningReply(
            speech="you're between stops.",
            action=VoiceAction(type="where_am_i"),
            source="on-device",
            engine="on-device",
            question="where_am_i",
        )

    def test_chatter_stays_empty_with_the_normal_verbosity(self) -> None:
        reply = offline_reason(ReasoningRequest(transcript="the coffee is cold"))
        assert reply == ReasoningReply(speech="", source="on-device", engine="on-device")

    def test_chatty_chatter_picks_an_offline_line(self) -> None:
        request = ReasoningRequest(
            transcript="the coffee is cold",
            settings=VoiceSettings(verbosity=Verbosity.CHATTY),
        )
        reply = offline_reason(request)
        expected = OFFLINE_LINES[len("the coffee is cold") % len(OFFLINE_LINES)]
        assert reply == ReasoningReply(speech=expected, source="on-device", engine="on-device")

    def test_small_talk_is_answered(self) -> None:
        reply = offline_reason(ReasoningRequest(transcript="cheers"))
        assert reply == ReasoningReply(speech="No worries.", source="on-device", engine="on-device")

    def test_an_empty_transcript_says_nothing(self) -> None:
        reply = offline_reason(ReasoningRequest(transcript="   "))
        assert reply == ReasoningReply(speech="", source="on-device", engine="on-device")

    def test_the_answer_of_chatter_is_empty_but_on_device(self) -> None:
        assert _answer_of(ReasoningRequest(transcript="the coffee is cold")) == ReasoningReply(
            speech="", source="on-device", engine="on-device"
        )

    def test_the_company_of_normal_chatter_is_empty(self) -> None:
        assert _company_of(ReasoningRequest(transcript="the coffee is cold")) == ReasoningReply(
            speech="", source="on-device", engine="on-device"
        )

    def test_the_question_of_each_action(self) -> None:
        assert _question_of_action(VoiceAction(type="how_many_left")) == "how_many_left"
        assert _question_of_action(VoiceAction(type="where_am_i")) == "where_am_i"
        assert _question_of_action(VoiceAction(type="mark_delivered")) is None

    def test_the_dynamic_speech_of_each_action(self) -> None:
        assert _dynamic_speech(VoiceAction(type="how_many_left"), a_day()) == "3 stops left."
        assert _dynamic_speech(VoiceAction(type="where_am_i"), a_day()) == "you're at 14 Harewood."
        assert _dynamic_speech(VoiceAction(type="where_am_i"), RunContext()) == "you're between stops."
        assert _dynamic_speech(VoiceAction(type="mark_delivered"), a_day()) == ""
