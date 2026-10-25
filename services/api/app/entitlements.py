"""The entitlement layer: one truth per courier, gated on "is this subscription active" (ADR-017).

The product's rules live here, not a payment provider's: the state machine decides
when a courier may work, and a failed renewal never removes access on its own - a
courier mid-route with a dead phone is the worst failure mode this product has.

Nothing here knows how a subscription was paid for. `source` is data recorded on
the row (`play`, `appstore`, `stripe`, `team`), never a branch in the logic, so
the founder's launch choice is a config switch rather than a code change (D44).
"""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime
from enum import Enum
from typing import Final


class Plan(str, Enum):
    """What the courier bought. The names are the ones the app prices (D44)."""

    TRIAL = "trial"
    SOLO = "solo"
    TEAM = "team"


TRIAL_DAYS: Final = 14
"""The trial's length: long enough to see the value, short enough to decide."""

FEATURES: Final[dict[Plan, frozenset[str]]] = {
    Plan.TRIAL: frozenset({"voice_commands", "offline_maps", "door_memory", "basic_routing"}),
    Plan.SOLO: frozenset(
        {
            "voice_commands",
            "offline_maps",
            "door_memory",
            "basic_routing",
            "routing",
            "dictation",
            "history",
            "ird_logbook",
        }
    ),
    # Team is the Solo set plus the organisation's features: its seats and org
    # billing are the Team slice, on top of this one (ADR-017 §4).
    Plan.TEAM: frozenset(
        {
            "voice_commands",
            "offline_maps",
            "door_memory",
            "basic_routing",
            "routing",
            "dictation",
            "history",
            "ird_logbook",
            "all_solo",
            "dispatcher",
            "team_analytics",
            "sms_notifications",
            "masked_calls",
        }
    ),
}


class SubscriptionState(str, Enum):
    """Where the subscription stands. Only the live ones open the app."""

    TRIALING = "trialing"
    ACTIVE = "active"
    PAST_DUE = "past_due"
    GRACE = "grace"
    CANCELED = "canceled"
    EXPIRED = "expired"


#: The states in which the courier may work. `past_due` and `grace` are here on
#: purpose: a failed renewal is a payment problem, not a reason to strand a
#: courier mid-route.
LIVE_STATES: Final[frozenset[SubscriptionState]] = frozenset(
    {
        SubscriptionState.TRIALING,
        SubscriptionState.ACTIVE,
        SubscriptionState.PAST_DUE,
        SubscriptionState.GRACE,
    }
)

#: The transitions, as one table the whole product can read.
#: Every state that is not named keeps its value (an unknown event is a no-op,
#: never a guess), and the terminal states accept nothing.
_TRANSITIONS: Final[dict[tuple[SubscriptionState, str], SubscriptionState]] = {
    (SubscriptionState.TRIALING, "confirmed"): SubscriptionState.ACTIVE,
    (SubscriptionState.TRIALING, "renewal_failed"): SubscriptionState.PAST_DUE,
    (SubscriptionState.TRIALING, "cancelled"): SubscriptionState.CANCELED,
    (SubscriptionState.ACTIVE, "renewal_failed"): SubscriptionState.PAST_DUE,
    (SubscriptionState.ACTIVE, "renewed"): SubscriptionState.ACTIVE,
    (SubscriptionState.ACTIVE, "cancelled"): SubscriptionState.CANCELED,
    # The grace window: the courier keeps working while the payment is sorted.
    (SubscriptionState.PAST_DUE, "renewed"): SubscriptionState.ACTIVE,
    (SubscriptionState.PAST_DUE, "grace_started"): SubscriptionState.GRACE,
    (SubscriptionState.PAST_DUE, "cancelled"): SubscriptionState.CANCELED,
    (SubscriptionState.GRACE, "renewed"): SubscriptionState.ACTIVE,
    (SubscriptionState.GRACE, "grace_ended"): SubscriptionState.EXPIRED,
    (SubscriptionState.GRACE, "cancelled"): SubscriptionState.CANCELED,
}


def transition(state: SubscriptionState, event: str) -> SubscriptionState:
    """The state after `event`, or the same state when the event changes nothing.

    A provider sending something we do not model cannot move a courier's access:
    the unknown event is a no-op, and the terminal states (`expired`, `canceled`)
    accept nothing at all - a lapsed subscription is not resurrected by a
    duplicate webhook.
    """
    return _TRANSITIONS.get((state, event), state)


@dataclass(frozen=True)
class SubscriptionView:
    """One courier's subscription as the server stores it."""

    courier_id: str
    plan: Plan
    state: SubscriptionState
    started_at: datetime
    ends_at: datetime | None = None


@dataclass(frozen=True)
class Entitlement:
    """The answer the app reads: may this courier do this today, and how."""

    courier_id: str
    active: bool
    plan: Plan | None
    features: frozenset[str]


def entitlement_of(subscription: SubscriptionView | None) -> Entitlement:
    """The decision for one courier, or the free answer when they have none.

    A courier with no subscription gets `active=False` with a named plan of
    `None` - the app shows the paywall, never a crash. An expired subscription
    keeps its plan so the app can say "your plan ended" rather than "you never
    had one".
    """
    if subscription is None:
        return Entitlement(courier_id="", active=False, plan=None, features=frozenset())
    return Entitlement(
        courier_id=subscription.courier_id,
        active=subscription.state in LIVE_STATES,
        plan=subscription.plan,
        features=FEATURES[subscription.plan] if subscription.state in LIVE_STATES else frozenset(),
    )
