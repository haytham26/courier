# Andee — clean-room ideas (ideas only, never code)

**Date:** 2026-11-08 · **Standing:** D48 / D24 — this file records *behaviours and
ideas* in our own words. **No code, no prompt text, no file name, no module or
class name, no model or provider identifier from the source project appears in
this document or anywhere in this repository**, and none may be added without a
separate founder decision. The source was read once, from its public repo root
only (README, getting-started, release notes, design/notes index), on 2026-10-27;
that read is recorded in `docs/research/2026/reference-repos.md` §Andee. This
document was written **without opening the source again** — everything below
comes from the in-repo record of that read and from
`docs/research/2026/andee-cleanroom-spec.md`.

**Licence note (why clean-room at all):** the source's licence is Apache-2.0
with additional conditions; condition A.1(d) forbids shipping it, or a
derivative, as a component of a product offered to others without the author's
prior written authorisation. Courier Copilot is offered to couriers, so A.1(d)
applies to any code taken. Hence: ideas only. The licence gate
(`scripts/ci/check-licenses.mjs`) runs on every PR.

---

## The ideas, and where each one stands in our product

### 1. A cheap, tool-less classifier call before the full turn — ADOPTED (built)

**The problem it solves:** most of what arrives at a voice assistant is
routine; if every routine utterance pays the full turn's cost (context
assembly, tool catalogue, model call), the common case gets the slow path and
the expensive model is spent on work that did not need it.

**The idea, in our words:** a small, closed set of routing outcomes sits in
front of the paid path, and one outcome is "do nothing, and record why" —
silence is a first-class, auditable answer, not an absence of one.

**Where it lives:** MASTER §22 technique A — `services/courier-voice/app/turn_gate.py`
(the pre-classifier; FREE / IGNORE / FULL routes, the reason recorded on every
turn's `gate` field). On main; the routing is reviewable after the fact.

### 2. Stop and ask instead of hammering when unsure — ADOPTED (built)

**The problem it solves:** acting on a guess is asymmetric — a wrong action
costs far more than a short question — and an agent that retries the same
failing step is worse than one that stops.

**The idea, in our words:** one confidence bar, held in configuration (not in
a prompt, not per feature), evaluated at the moment an action is about to be
taken; below it the system puts one short question to the human instead of
acting, and the question is a recorded event in the transcript.

**Where it lives:** MASTER §22 technique B — `TurnRequest.stt_confidence` plus
the single configured bar `VOICE_ASK_CONFIDENCE_BAR`; below the bar the turn is
answered with one short question (`notice`, no `action`, `last_question =
"ask:<type>"`) at the decision point on both routes. ADR-028 (D65), BUG-273.
The bar's final tuning waits for the founder's held-out sentence set
(FOUNDER_TODO).

### 3. A per-device memory the user can inspect and clear — ADOPTED (built)

**The problem it solves:** hidden state makes an assistant untrustworthy in
full or in nothing — the user cannot correct what they cannot see, and stale
state makes later turns more expensive and less accurate.

**The idea, in our words:** a short, current "what I think is true right now"
surface beside the conversation — every entry correctable, everything clearable
with a real action, and finished things put away visibly rather than silently.

**Where it lives:** MASTER §22 technique C — the read half is
`GET /v1/sessions/{id}/memory` → `SessionMemoryView` (ADR-028, D65, BUG-273);
the clear half is `DELETE /v1/sessions/{id}/memory` with the app's Remember /
Forget controls (BUG-202, PR #256). Contract for the app is in ADR-028.

### 4. Aiming on a labelled grid instead of coordinate maths — NOT ADOPTED for the driver

**The problem it would solve:** driving another app's UI by coordinates is
brittle; a labelled grid of tap targets is robust to layout shifts.

**Why we do not build it:** Courier Copilot never taps the screen for the
courier — the driving-safe rules forbid asking for a touch while moving, and
the voice acts through our own command surface, not through other apps. The
underlying capability (operating other apps through the platform's
accessibility service) is restricted by Google Play to apps whose core purpose
is accessibility, with a declaration and review; D48 rules it out of the trial
scope. MASTER §22 step 3 keeps it as a research-only spike with a Play-policy
check first, and the founder decides from that document. **Recorded here as an
idea, not a plan.**

### 5. Ideas recorded but not built (later, each needs its own decision)

In our words, from the same clean-room read — none is code, none is scheduled:

- **A running timeline of non-conversation events.** Everything the system did
  unprompted — a reminder firing, a routine it chose to skip, a self-check
  failing — as quiet lines with the reason, in the same log as the
  conversation. Our turn gate already records its routing reason per turn
  (`gate`); a full event timeline is the natural next slice.
- **A truthful self-check surface.** A card naming exactly which readiness or
  capability item is missing and what refusing it costs. Candidate for the
  acceptance run's report, not for v1.0.0 of the copilot.
- **Memory with per-entry editing.** Our visible memory is one surface with a
  whole-shift clear; individually editable entries (delete one door note, not
  the shift) are a later idea under the same PIA rules.
- **An escalation budget as a number.** "N identical failures, then a different
  plan or a hand-back" — the bar exists in §22-B's thread today; making the
  retry budget an explicit configured number is a later idea.

---

## What this file is not

It is not a spec to build from (that was `docs/research/2026/andee-cleanroom-spec.md`,
now built as §22 A/B/C), not a licence clearance (none exists — A.1(d) forbids
shipping the source in this product), and not a promise to build §5's items.
It is the record that the ideas were read clean-room and are ours to implement
our own way — which is what D48 decided.
