"""The small talk, and the rules that keep it in bounds."""

from __future__ import annotations

from app.models import RunContext, Stop, StopStatus
from app.smalltalk import NEEDS_INTERNET_REPLY, NEEDS_INTERNET_TOPICS, REFUSALS, smalltalk_reply


def a_run() -> RunContext:
    """A day in the middle."""
    return RunContext(stops=(Stop(id="s1", status=StopStatus.DELIVERED),))


def test_a_greeting_is_answered():
    assert smalltalk_reply("good morning", a_run(), online=False) is not None


def test_thanks_are_answered():
    assert smalltalk_reply("cheers", a_run(), online=False) == "No worries."


def test_a_joke_is_told():
    assert smalltalk_reply("tell me a joke", a_run(), online=False) is not None


def test_the_day_is_the_small_talk_that_needs_no_internet():
    reply = smalltalk_reply("how's the day going?", a_run(), online=False)
    assert reply is not None
    assert "0 done" in reply or "1 done" in reply


def test_the_weather_needs_the_internet():
    reply = smalltalk_reply("what's the weather like?", a_run(), online=False)
    assert reply == "I need the internet for that."


def test_the_news_needs_the_internet():
    reply = smalltalk_reply("any news?", a_run(), online=False)
    assert reply == NEEDS_INTERNET_REPLY


def test_the_medical_advice_is_refused():
    reply = smalltalk_reply("should I take this painkiller?", a_run(), online=False)
    assert reply == "that's a call for a doctor, not me"


def test_the_legal_advice_is_refused():
    reply = smalltalk_reply("can I claim this on my legal aid?", a_run(), online=False)
    assert reply == "that's a call for a lawyer, not me"


def test_the_money_advice_is_refused():
    reply = smalltalk_reply("should I invest in some shares?", a_run(), online=False)
    assert reply == "that's money advice, ask a proper advisor"


def test_the_people_of_the_courier_are_not_the_business_of_the_voice():
    reply = smalltalk_reply("my wife thinks I should quit", a_run(), online=False)
    assert reply == "that's yours to talk about, not me"


def test_the_voice_never_says_it_is_an_artificial_intelligence():
    reply = smalltalk_reply("are you an AI?", a_run(), online=False)
    assert reply == "I'm Courier Voice, your shift companion"
    assert "AI" not in reply


def test_the_politics_is_not_the_business_of_the_voice():
    reply = smalltalk_reply("who should I vote for?", a_run(), online=False)
    assert reply == "I don't go into that"


def test_the_safety_of_the_courier_comes_first():
    reply = smalltalk_reply("I want to kill myself", a_run(), online=False)
    assert reply == "if things get that heavy, talk to someone who can help"


def test_every_refusal_has_a_reason():
    for rule in REFUSALS:
        assert rule.reason.strip() != ""
        assert rule.reply.strip() != ""


def test_the_small_talk_is_bounded_offline():
    """A subject the voice does not know gets no canned line."""
    reply = smalltalk_reply("tell me everything you know", a_run(), online=False)
    assert reply is None
    assert NEEDS_INTERNET_TOPICS.search("tell me everything you know") is None
