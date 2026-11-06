# Evidence — MASTER §22 technique A: the pre-classifier (the free gate)

**Step:** MASTER_EXECUTION §22 (founder decision 2026-10-27, D48), technique A of the
clean-room spec (`docs/research/2026/andee-cleanroom-spec.md`) · **Branch:**
`voice-pre-classifier` · **Date:** 2026-11-04

## What landed

`services/courier-voice/app/turn_gate.py` — the free gate in front of the paid
turn — wired into the turn route:

- **A closed set of outcomes.** `TurnRoute` has three members (`free`, `ignore`,
  `full`); the gate's job is routing, never answering. `RoutedTurn` carries the
  route, the reason and the command it found.
- **The free gate is free.** `route_turn` is pure and local: no model call, no
  gateway, no run fetch. A command the offline brain knows — and whose answer
  does not read the day (`CONTEXT_FREE_COMMANDS`: the delivery, the failure, the
  skip, the add, the note, the two breaks) — is answered from the catalogue's
  own rules, which is exactly the round trip the paid path's first act
  (`_context_of`, the HTTP call to the API) would have paid.
- **Silence is a first-class outcome.** A turn with no words in it routes
  `ignore` with its reason, rather than spending a model call on nothing.
- **The routing decision is visible.** The turn's answer carries
  `gate: "free: the offline brain knows this command ..."` (or `full: ...`), so
  the decision is reviewable after the fact — the spec's "things it chose not to
  act on are visible after the fact".

## Red first (PLAYBOOK §14)

`tests/test_turn_gate.py` (10 tests) was red on the pre-change tree at collection
(`app.turn_gate` did not exist). The tests pin: the closed set, the silence
outcome with its reason, the context-free command set (a command that reads the
day stays on the full path), the gate's independence from the context, the
routing accuracy over the evaluation set's own gold scripts, the gate's cost
bound (200 turns in well under a second), and — through the real turn route, in
ONLINE mode — that a routed command answers with the engine's call count still
at zero.

## The numbers (§22 asks for the before/after with the tokens and the latency)

Measured by running every one of the evaluation set's 720 scripts through the
service's own turn route, ONLINE mode, with a counting engine standing in for
the gateway (no OmniRoute deployment yet — see below):

| | before (every turn) | after (the gate) |
|---|---|---|
| engine calls for the 720 turns | 720 | **305** |
| turns answered free | 0 | **415 (57.6 %)** |
| routed commands answered wrong vs the gold intent | — | **0** |
| mean turn latency | — | free 1.35 ms / full 1.97 ms |

Re-measured on the shift simulations' own 24 turns (a second, scripted set):
**7 free (29.2 %)**, 0 wrong — the routing is correct on both, and the share is
lower because a full shift is mostly conversation.

**Both numbers are ceiling-shaped, and say so (BUG-210).** The 720 scripts are
the eval generator's own templates, and the offline brain's regexes spell those
templates out word for word (11 standing overlaps — the gate
`scripts/ci/check-parser-circularity.mjs` names every one and fails on a new
one). The free share is therefore "the parser's own commands answered without a
model call", not a measured property of held-out speech; the held-out set is
the founder's to give (FOUNDER_TODO).

The numbers §22 asked for that CANNOT be measured are named, not estimated: the
gateway round trip and the token counts depend on an OmniRoute deployment,
which is the founder's item (`docs/status/FOUNDER_TODO.md`) — a number that was
not measured is never reported as a pass. **§22's "with numbers" stays UNMET
until then.**

## Techniques B and C — the lane's next steps, honestly

- **B, ask-on-low-confidence:** the turn's reply carries no confidence today, so
  the bar has nothing to evaluate; the address engine on the API side already
  has one. It needs the reply's confidence to be a first-class field and the bar
  to be applied at the decision point.
- **C, visible and clearable memory:** the service half exists (`memory.py`,
  `POST /v1/sessions/{id}/memory`'s DELETE, the bounded store); the visible,
  per-entry surface is the app's, the lead's queue.

Both are recorded as the lane's next steps, not as done.
