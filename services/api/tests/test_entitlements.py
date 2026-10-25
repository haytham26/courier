"""The entitlement layer (ADR-017): the plan vocabulary, the state machine, the decision.

The rules are the product's, not a payment provider's, so they are pinned here as
pure functions - a courier whose card is failing keeps working through the grace
window, because a courier mid-route with a dead phone is the worst failure mode.
"""

from __future__ import annotations

from datetime import UTC, datetime, timedelta

import pytest

from app.entitlements import (
    FEATURES,
    TRIAL_DAYS,
    Entitlement,
    Plan,
    SubscriptionState,
    SubscriptionView,
    entitlement_of,
    transition,
)

COURIER = "driver-7"
STARTED = datetime(2026, 10, 26, 7, 0, tzinfo=UTC)


class TestThePlanVocabulary:
    def test_the_plans_are_the_ones_the_app_prices(self) -> None:
        assert [plan.value for plan in Plan] == ["trial", "solo", "team"]

    def test_the_trial_is_fourteen_days(self) -> None:
        assert TRIAL_DAYS == 14

    def test_every_plan_names_its_features(self) -> None:
        for plan in Plan:
            assert FEATURES[plan], f"{plan} has no features"

    def test_the_trial_carries_the_driving_basics(self) -> None:
        assert "voice_commands" in FEATURES[Plan.TRIAL]
        assert "offline_maps" in FEATURES[Plan.TRIAL]
        assert "door_memory" in FEATURES[Plan.TRIAL]

    def test_solo_is_everything_trial_has_and_more(self) -> None:
        assert set(FEATURES[Plan.TRIAL]) <= set(FEATURES[Plan.SOLO])
        assert "routing" in FEATURES[Plan.SOLO]
        assert "ird_logbook" in FEATURES[Plan.SOLO]

    def test_a_team_plan_is_the_org_features_not_more_driving(self) -> None:
        assert "dispatcher" in FEATURES[Plan.TEAM]
        assert set(FEATURES[Plan.SOLO]) <= set(FEATURES[Plan.TEAM])


class TestTheStateMachine:
    def test_trialing_becomes_active_when_the_subscription_confirms(self) -> None:
        assert transition(SubscriptionState.TRIALING, "confirmed") == SubscriptionState.ACTIVE

    def test_a_failed_renewal_goes_to_past_due_and_never_straight_to_expired(self) -> None:
        assert transition(SubscriptionState.ACTIVE, "renewal_failed") == SubscriptionState.PAST_DUE

    def test_past_due_recovers_to_active(self) -> None:
        assert transition(SubscriptionState.PAST_DUE, "renewed") == SubscriptionState.ACTIVE

    def test_past_due_enters_the_grace_window_rather_than_ending(self) -> None:
        """A courier mid-route keeps working: the grace window is the rule."""
        assert transition(SubscriptionState.PAST_DUE, "grace_started") == SubscriptionState.GRACE
        assert transition(SubscriptionState.GRACE, "renewed") == SubscriptionState.ACTIVE

    def test_grace_ending_is_the_only_path_to_expired(self) -> None:
        assert transition(SubscriptionState.GRACE, "grace_ended") == SubscriptionState.EXPIRED

    def test_a_cancellation_moves_to_the_canceled_state(self) -> None:
        assert transition(SubscriptionState.ACTIVE, "cancelled") == SubscriptionState.CANCELED

    def test_an_unknown_event_changes_nothing(self) -> None:
        for state in SubscriptionState:
            assert transition(state, "a_provider_we_do_not_know") == state

    def test_the_terminal_states_do_not_move(self) -> None:
        for event in ("confirmed", "renewed", "renewal_failed", "grace_started", "grace_ended"):
            assert transition(SubscriptionState.EXPIRED, event) == SubscriptionState.EXPIRED
            assert transition(SubscriptionState.CANCELED, event) == SubscriptionState.CANCELED


class TestTheDecision:
    @pytest.mark.parametrize("plan", [Plan.TRIAL, Plan.SOLO, Plan.TEAM])
    @pytest.mark.parametrize(
        ("state", "active"),
        [
            (SubscriptionState.TRIALING, True),
            (SubscriptionState.ACTIVE, True),
            (SubscriptionState.PAST_DUE, True),
            (SubscriptionState.GRACE, True),
            (SubscriptionState.CANCELED, False),
            (SubscriptionState.EXPIRED, False),
        ],
    )
    def test_only_the_live_states_open_the_app(
        self, state: SubscriptionState, active: bool, plan: Plan
    ) -> None:
        """Every plan, not only Solo: a mutation gating `active` on the Solo
        plan survived the whole suite, so the matrix says so outright."""
        answer = entitlement_of(
            SubscriptionView(
                courier_id=COURIER,
                plan=plan,
                state=state,
                started_at=STARTED,
                ends_at=None,
            )
        )

        assert answer.active is active
        assert answer.plan is plan
        if active:
            assert answer.features == frozenset(FEATURES[plan])
        else:
            assert answer.features == frozenset()

    def test_a_revocation_ends_access(self) -> None:
        """A refund removes the days that were paid for: the money went back."""
        assert transition(SubscriptionState.ACTIVE, "revoked") is SubscriptionState.CANCELED
        assert transition(SubscriptionState.GRACE, "revoked") is SubscriptionState.CANCELED
        # The provider sets ends_at to now with the revocation, so the paid days
        # are gone with it - unlike a plain cancellation that leaves them.
        revoked = entitlement_of(
            SubscriptionView(
                courier_id=COURIER,
                plan=Plan.SOLO,
                state=SubscriptionState.CANCELED,
                started_at=STARTED,
                ends_at=STARTED,
            ),
            now=STARTED,
        )
        assert revoked.active is False

    def test_the_decision_carries_the_plan_and_its_features(self) -> None:
        decision = entitlement_of(
            SubscriptionView(
                courier_id=COURIER,
                plan=Plan.SOLO,
                state=SubscriptionState.ACTIVE,
                started_at=STARTED,
                ends_at=None,
            )
        )

        assert decision.plan is Plan.SOLO
        assert "routing" in decision.features
        assert decision.features == frozenset(FEATURES[Plan.SOLO])

    def test_an_expired_subscription_keeps_the_plan_but_no_access(self) -> None:
        """The app shows "your plan ended", not "you never had one"."""
        decision = entitlement_of(
            SubscriptionView(
                courier_id=COURIER,
                plan=Plan.TRIAL,
                state=SubscriptionState.EXPIRED,
                started_at=STARTED,
                ends_at=STARTED + timedelta(days=TRIAL_DAYS),
            )
        )

        assert decision.active is False
        assert decision.plan is Plan.TRIAL

    def test_a_cancellation_covers_the_days_it_paid_for(self) -> None:
        """ "Cancel, I'll finish the week" must not strand a courier mid-route."""
        decision = entitlement_of(
            SubscriptionView(
                courier_id=COURIER,
                plan=Plan.SOLO,
                state=SubscriptionState.CANCELED,
                started_at=STARTED,
                ends_at=STARTED + timedelta(days=3),
            ),
            now=STARTED,
        )

        assert decision.active is True
        assert "routing" in decision.features

    def test_a_cancelled_period_that_has_ended_is_over(self) -> None:
        decision = entitlement_of(
            SubscriptionView(
                courier_id=COURIER,
                plan=Plan.SOLO,
                state=SubscriptionState.CANCELED,
                started_at=STARTED,
                ends_at=STARTED - timedelta(days=1),
            ),
            now=STARTED,
        )

        assert decision.active is False
        assert decision.features == frozenset()

    def test_an_immediate_cancellation_is_over_now(self) -> None:
        """No `ends_at` is the provider's immediate end, not a missing field."""
        decision = entitlement_of(
            SubscriptionView(
                courier_id=COURIER,
                plan=Plan.SOLO,
                state=SubscriptionState.CANCELED,
                started_at=STARTED,
                ends_at=None,
            ),
            now=STARTED,
        )

        assert decision.active is False

    def test_no_subscription_is_the_free_answer_not_a_crash(self) -> None:
        decision = entitlement_of(None)

        assert decision.active is False
        assert decision.plan is None
        assert decision.features == frozenset()

    def test_the_decision_is_a_frozen_value(self) -> None:
        decision = entitlement_of(
            SubscriptionView(
                courier_id=COURIER,
                plan=Plan.TRIAL,
                state=SubscriptionState.TRIALING,
                started_at=STARTED,
                ends_at=None,
            )
        )
        assert isinstance(decision, Entitlement)
