# Andee — clean-room behavioural spec for three turn-shaping techniques

**Date: 2026-10-30.** Source studied: the public repository `kuafuai/andee` (repo root only, read via its README, its getting-started and release notes, and its design/notes index).

**What this document is.** A behavioural specification of three techniques that project uses to keep a voice agent's turns cheap, honest and legible. It exists so we can decide, in decision D48, whether to adopt them for a courier assistant that runs on a phone in a van, on one spoken command at a time.

**What "clean-room" means here.** Everything below is described as *behaviour*: what the user sees, what the system does, and what goes wrong when the technique is absent. Nothing was transcribed. We deliberately did not read the project's source files, and we did not copy:

- any code, in any language;
- any prompt text — system prompt, tool descriptions, persona copy, or the wording the assistant uses;
- any file name, directory layout, module name, class name, tool identifier, configuration key, or setting label from the source project;
- any model identifier, endpoint, provider name, or default-provider choice;
- any numeric threshold, budget, ratio, token count, pixel value, radius, timeout, step limit or ration level.

Where a number would be needed to implement the technique, we say *"a bar, tuned per surface"* and leave the value to our own measurement. Our own repo's existing numbers (the ≤700 ms voice-to-action bar, the APK size cap, the battery budget) are ours and are referenced as ours, not as anything borrowed.

**Standing of this document.** It is research input, not a decision. It is written so a reader could implement the three techniques without ever opening the source project.

---

## 1. Technique A — the pre-classifier

### Problem it solves

An agent turn is expensive in three ways at once: tokens, wall-clock latency, and the risk of the large model wandering. But most of what arrives at a voice assistant is *routine*. If every routine utterance is pushed through the full turn — screen context, tool catalogue, whole reasoning loop — then the common case pays the slow path's cost, the user waits seconds for an answer they could have had in milliseconds, and the expensive model is spent on work that did not need it. Worse, the routine traffic trains everyone to expect the slow path, so the interesting cases get no more budget than the boring ones.

The second half of the problem is subtler. An agent does not only act on what the user says; it also has to decide, constantly, *whether to act at all*. Notifications, scheduled items and its own "should I speak now?" checks all arrive unprompted. Without a gate in front of them, the agent either reacts to everything — noisy, expensive, and eventually muted by the user — or it ignores the whole class and misses the things that mattered.

### Behaviour, in our own words

A cheap classifier sits in front of the expensive turn and assigns the incoming thing to one of a small, fixed set of known outcomes. The classifier is deliberately small and fast: it sees the utterance (and little else), it has no tools, and it runs in a fraction of the time and tokens a full turn would.

Three properties make it work rather than merely add a step:

1. **A closed set of outcomes, not a free-form answer.** The classifier's job is *routing*, not solving. "This is one of the known kinds, kind K" is a different and much cheaper question than "here is how to handle this". The expensive model is only consulted when the answer is "none of the known kinds, or one of them but not resolvable without the full context".
2. **A free gate in front of the paid gate.** Many of the things that could reach the expensive path are decided without any model call at all — a pure, local, deterministic check ("nothing is overdue, so there is nothing to do"). Most of the traffic stops there and costs nothing. Only what survives the free gate is worth a cheap classification, and only what survives *that* is worth a full turn.
3. **A bias built into the outcome set.** One of the outcomes is "do nothing, and record why". Making silence a first-class, cheap outcome — rather than an absence of action — is what keeps the gate from being a machine for manufacturing work. The recorded "why" is what makes the silence auditable instead of invisible.

In the source project the concrete shape is a notifier triage: each incoming notification is classified as *act on it*, *tell the user in one spoken sentence*, or *ignore it and log the reason* — with a deliberate tilt toward the third, and a fallback to asking the user when the classifier genuinely cannot decide. The same shape is used for classifying a shell command by risk before it runs, and the whole family of "should I act, speak, or stay quiet?" decisions sits behind it.

### What the user sees

- Answers to routine utterances arrive quickly, because the routine ones never waited for the slow path.
- An unfiltered stream of interruptions does not appear. The user is not asked about things that did not need asking about.
- When the assistant *does* decide something routine was worth a mention, the mention is short — one line, not a card.
- Things it chose not to act on are visible after the fact in a running log, so the decision can be reviewed rather than assumed.
- For genuinely novel input, the user sees the same full experience as before, so the gate is invisible in the good case.

### What the system does internally, behaviourally

- **Classify first, load context second.** The classifier runs before any assembly of screen state, tool catalogue, or conversation history. It must not be able to *see* the expensive context, because if it can, it starts paying for it.
- **Give the classifier a small, explicit label set.** The labels are the contract; adding one is a product decision, not something a model may invent at runtime.
- **Keep a zero-cost pre-filter.** Anything decidable without a model call is decided without one. This is the cheapest and most often forgotten half of the technique.
- **Log the routing decision.** Each routing outcome — including "ignored, because…" — is recorded with enough information to answer "why did it not tell me about that?" a week later.
- **Bound what a routed-elsewhere path is allowed to do.** A turn that was triggered by something other than the user is a *less trusted* turn. It carries the same agent loop, but a reduced set of capabilities: it may not reach credentials, and it may not create or enter a long-running mode of operation on its own. This is enforced by the dispatcher, not by asking the model nicely.
- **Treat untrusted content as content.** The text the classifier read came from outside the user's own mouth. It is fenced as data — something to be classified, not obeyed.

### Failure mode it prevents

**Everything pays the slow path.** Without the gate, a trivial utterance costs a full turn, latency becomes uniform and unusable, and the agent's budget is consumed by its least interesting input. Without the built-in bias toward "do nothing", the agent is a notification firehose and the user mutes it, which also silences the notifications that mattered. Without the capability reduction on externally-triggered turns, a stranger's message is an instruction with the full privileges of the user's own voice.

---

## 2. Technique B — ask-on-low-confidence

### Problem it solves

The failure modes of an agent that acts on a guess are all expensive and asymmetric. It taps the wrong thing and sends a message under the user's name. It books the wrong half of a journey. It answers confidently from a summary and denies that something happened. It repeats the same failing action until it has done damage. In each case the *cost of being wrong is much larger than the cost of waiting* — and the agent has no internal signal that says "I am about to be wrong", so it never stops.

The opposite failure is just as real. An agent that asks about everything is unusable, and the user learns to answer without reading. So the question is not *whether* to ask; it is *when* to ask, and how to make both the bar and the question shaped the same way every time.

### Behaviour, in our own words

When the system's confidence in what it is about to do falls below a bar, it stops and puts one short question to the human instead of acting on the guess. The distinguishing properties:

1. **The bar is behaviour, configured once, not a per-feature decision.** The threshold, the shape of the question, and what counts as an acceptable answer live in one configurable place, so "when do we ask?" is answered identically across the whole product. A new feature cannot re-litigate it, and no single feature quietly hard-codes a lower bar because it is in a hurry.
2. **The question is short, and there are few of them.** One question, offered with a small number of concrete answers (plus the option to say it in words instead). It is a question the user can answer while driving, not a form.
3. **Asking is a visible, recorded event.** The question asked and the answer given both land in the running transcript, in the same place a spoken turn would. The user can go back and see what they agreed to; the system cannot act on a choice that nobody can see was made.
4. **Some refusals need no model at all.** A "no thanks" answer closes the question without waking the expensive path, because declining does not require a considered response. Only an answer that continues the task costs a turn.
5. **Not knowing is said out loud.** When the thing being asked about is absent, the system says it is absent rather than picking the nearest plausible substitute and continuing.
6. **Repeated failure escalates rather than repeats.** If the same attempt fails again, the system stops routing around the problem and either names a different approach or hands it back to the user. A bounded number of identical attempts, then a change of plan — never an unbounded retry loop.

In the source project this shows up in several places with one shape: the pre-classifier's "cannot decide" outcome falls through to asking the user; a guard refuses to tap the same spot a fourth time so the agent stops and asks instead of hammering; a destructive operation is described and confirmed before it runs, with an "always allow this kind" option so the bar is paid once rather than every time; a request arriving from another party is put to its owner before anything happens; and a task cut off by a step limit is kept explicitly unfinished, with every later turn told that it was cut off, rather than being silently-truncated and answered from the remainder.

### What the user sees

- A short question at the moment the system is unsure, not a confession afterwards.
- Two or three concrete answers on a card, plus the option to just say it.
- The question and their answer appear in the conversation as a normal exchange, so the record is complete.
- When they decline, nothing else happens — no spurious acknowledgement, no follow-up turn.
- When the system has hit its attempt limit, it says so and asks them to take that step, instead of trying again.
- When a suggestion is proposed (a new routine, a standing rule), nothing is saved until they say yes.

### What the system does internally, behaviourally

- **One confidence bar, evaluated at the decision point.** The bar is applied by the dispatcher, at the moment an action is about to be taken — not by the model deciding whether it feels sure. The bar is configuration, not prompt text.
- **Confidence is not only a model output.** Behavioural signals count too: this action failed the last two times; the target has moved since it was read; the same location has been tried repeatedly; the input came from an untrusted source. These raise the ask-bar without any introspection from the model.
- **The question is generated from the decision context.** What is being asked, the concrete options, and what each option commits to — so that answering is unambiguous and the commitment is legible.
- **The answer is a value, not a transcript.** The chosen option (or the user's words) is recorded as the answer to that specific question; a timeout records nothing, because nothing was chosen.
- **Escalation is a budget, not a vibe.** N identical failures, then a different plan or a hand-back. The budget is a number in configuration.
- **Honesty about truncation and absence.** A turn that ran out of steps is marked unfinished and stays open; a record that was capped or deleted says so rather than being passed over silently.

### Failure mode it prevents

**A confident wrong action.** This is the technique that stops the irreversible: a message sent to the wrong person, a purchase completed, a delete executed, a confident answer that denies a thing that happened. It also prevents the two adjacent pathologies: the unbounded retry loop that does the same damage until something breaks, and the "silently truncated task" that is answered from its stump and later denied. And because the bar is shared configuration rather than per-feature judgement, it prevents the *gradual* failure — each new feature deciding that its own guesses are probably fine.

---

## 3. Technique C — visible and clearable memory

### Problem it solves

An agent holds state: what it thinks the user wants right now, what it has collected so far, what it has already promised, what it has inferred about the person. All of that is normally invisible. Hidden state produces two failures that look identical from outside: the user cannot tell the agent "no, that is wrong" because they cannot see what it believes, and the agent cannot tell the user why it did something, because it cannot show its reasoning. The result is an assistant the user has to distrust in full or in nothing.

The second problem is cost and clutter. State that is kept forever — every finished conversation, every stale belief — makes every later turn more expensive and less accurate. Finishing a topic and putting it away is right; doing it silently is wrong, because a summary that reads complete loses its details and then confidently denies them.

### Behaviour, in our own words

The assistant keeps a short, on-screen list of what it currently believes, and the user can see it and can clear or correct it at any time. The properties:

1. **Short and current, not a full history.** What is on screen is the live belief: the pending intents, the slots collected so far, the corrections made, the routine currently in effect. It is a "what I think is true right now" surface, not an archive.
2. **Always reachable, one tap away.** It lives beside the conversation, not behind a settings screen. If seeing the state requires navigating away from the conversation, it will not be looked at.
3. **Every entry is correctable and clearable.** Each belief can be edited or deleted by the user directly, not only by telling the agent in words and hoping. "Clear it" is a real, immediate action.
4. **Actions are announced where they happen.** When the assistant acts on the user's behalf — filling a credential, running a command, entering a routine — the user sees it at the moment it happens, on the assistant's face, rather than learning about it afterwards.
5. **Finished things are put away, not deleted — and the putting-away is visible.** A topic that has ended is collapsed into a short card that stands where the conversation was, offering to continue it, to show the verbatim transcript, or to reopen what it produced. The summary's last line states what it left out, so a reader knows it is a summary.
6. **Non-conversation events are logged as events.** Things the system did without being asked — a reminder firing, a routine it chose to skip, a self-check failing, a turn the user cut off — appear as quiet lines in the same running log, with the reason, not as fake assistant chat lines.
7. **A stop is reported, never silent.** When the user stops work in progress, one line says what was stopped and what was dropped.

In the source project the concrete surface is a personal notebook with several tabs — autobiographical notes, things being watched, a diary, a plan, the people it knows, a wiki, memories and todos — every memory and todo individually deletable, and every entry readable. Beside it sits a timeline of everything that was not conversation, a chip naming whichever routine is currently active with a single control to leave it, and a self-check card that names exactly which readiness item is missing and offers the door to fix it.

### What the user sees

- A running list of what the assistant currently believes and is doing, updated as it goes, one tap from the conversation.
- A visible marker whenever a long-running routine is in effect, and a one-tap way out of it.
- Each remembered thing individually deletable, and a way to see everything it remembers rather than being told it is "not much".
- Past topics as cards where the messages used to be, with the summary, the option to read the verbatim transcript, and the option to reopen what was produced.
- A quiet log of everything it did unprompted, with the reason for each — including what it chose *not* to act on.
- A truthful self-check: which capability is missing, and what refusing each one costs.

### What the system does internally, behaviourally

- **State is a first-class artefact, written down as it happens.** Pending intents and collected slots are recorded at the moment they are established, not reconstructed from the transcript later. This is what makes them showable.
- **The user's view and the agent's context read the same store.** The on-screen list is not a rendering of a private structure the agent keeps for itself; they are one thing. Correcting the record corrects what the agent will act on.
- **Summarisation is append-only and reversible.** Collapsing a finished topic writes a summary plus a marker and archives the verbatim text; nothing is destroyed, and the summary is explicitly incomplete. The agent is told never to answer a question about a collapsed topic from its one-line summary alone, and never to deny the topic happened.
- **The device computes the numbers, not the model.** How overdue something is, whether a promise was kept, how many times a guard tripped — these are counted from the record by the code. The model is not asked to grade itself.
- **Deletion is total and immediate.** Clearing a record clears it, including any in-flight work that would carry it forward. A stop that only half-stops is how cleared state carries on talking.
- **Capability refusals are per-call and per-capability.** Each sensitive action checks its own permission before acting and degrades on its own; refusing one thing removes one thing and nothing else. The refusal is reported as what it is, not worked around.

### Failure mode it prevents

**Hidden state.** Without this, the user is either trusting blindly or checking constantly, and both are exhausting. It also prevents the specific pathologies of summarisation: the summary that answers confidently from its stump, the denial that a past conversation happened, the "saved" that was never saved, and the workflow that cannot be interrupted. And because every remembered item is individually clearable, it prevents the failure where memory becomes a liability — a record the user disagrees with and cannot get rid of.

---

## 4. How the three compose into one turn

Described as behaviour, one turn looks like this.

**Step 0 — something arrives.** A turn can begin five ways: the wake word, the user's voice or typing, an external event such as a notification, a timer, or a request from another party. Everything that arrives is logged, whatever happens next.

**Step 1 — the free gate.** Before any model is consulted, the system asks whether there is anything to do at all. If nothing is due, the turn ends here, at zero cost, and the fact that it ended is recorded.

**Step 2 — the pre-classifier.** What survived is classified against the fixed set of known outcomes. Each outcome is cheap and bounded: resolve it directly, speak one line about it, do nothing and log why, or escalate to the full turn. Text that arrived from outside the user's own mouth is treated as data to classify, and the resulting turn carries a reduced privilege set for the rest of its life.

**Step 3 — the full turn, only where needed.** For the escalated case, the system assembles the expensive context — the persistent instructions, the current visible state, the tool catalogue, the record index — and runs the agent loop. The loop is bounded by a step limit and by guards, not by good behaviour. Each reply that requests actions goes through one dispatcher; a reply that requests nothing ends the turn.

**Step 4 — the confidence bar, at every action.** Before each requested action is executed, the bar is checked. Behavioral signals — repeated failures at the same spot, a stale target, an untrusted source, an action of irreversible kind — raise the bar. Below the bar, the turn pauses and puts one short question to the user, with a few concrete answers. The answer is recorded against that question; the question and answer both appear in the transcript. Declining closes the question without a further turn. If the failure count reaches its budget, the system names a different approach or hands the step to the user.

**Step 5 — the guards, in code.** Independently of anything the model said, the dispatcher refuses what it refuses: capabilities the current turn is not allowed to reach, actions that would need a credential the turn must not see, and the final confirmation of anything irreversible. These are enforced in the dispatcher, so a page or a message that argues otherwise does not get its way.

**Step 6 — the result goes out, through more than one channel.** Speech, text on screen, a full-screen page, a saved artifact, long text, and physical motion are separate outputs. The assistant says what it did in words, and shows it on its face as it does it.

**Step 7 — the state is written where the user can see it.** Whatever was decided, collected, promised or skipped is appended to the visible record: the live belief list, the timeline of unprompted events, and — if a topic ended — a card standing where the conversation was, saying what it folded and what it left out.

**Step 8 — the turn closes, honestly.** If it was cut off, it stays marked unfinished until it is finished or it ages out; every later turn is told it was cut off. If a scheduled item was created, the device — not the model — confirms it is actually set before the assistant claims it is.

The three techniques are one idea in three places. The pre-classifier keeps the expensive path rare. The confidence bar keeps the expensive path honest. The visible record keeps both of them checkable. Remove any one and the other two degrade: a cheap classifier that cannot be checked becomes an unexplained silence; an honest agent you cannot inspect becomes one you must trust absolutely; and a visible record that everything is dumped into becomes noise nobody reads.

---

## 5. What we deliberately did NOT copy

We took behaviour, and left everything that would make this a derivative work. Specifically, we did not take:

- **Code.** No source, in any language, in any form — adapted, translated, or excerpted. No build scripts, no configuration, no tests.
- **Prompts and model-facing text.** No system prompt, no persona or character copy, no tool or argument descriptions, no instruction text, no error or refusal messages, no user-visible strings. Where our version needs wording, we write our own.
- **File names and internal identifiers.** No file paths, directory or module layout, class or function names, tool identifiers, setting keys, wire-protocol field names, or configuration flags from the source project. Our naming follows our own conventions.
- **Model identifiers and provider choices.** No model names, endpoints, default provider, service selection, or credential-scheme design. We use our own evaluation sets and our own provider decisions.
- **Thresholds and budgets.** No token counts, ratios, radii, pixel values, timeouts, step limits, ration levels, or calibration numbers. The source project's numbers came from its own devices and its own measurements; ours must come from ours.
- **Product-level design and domain specifics.** No persona design, no character or visual system, no scene catalogue, no notification-triage label vocabulary, no robot-dog or hardware-safety specifics, no packaging or release tooling, no peer-pairing or trust model, and no branding.
- **Structure of the reasoning.** Even where the source project wrote down *why* it chose something and what it rejected, we have not carried its argument across; we re-derived the behaviours above from what a user can observe and wrote them in our own terms.

Anything a reader recognises from the source project in this document should be recognised as *behaviour* — the kind of thing that is visible to any user — and not as expression. If in doubt, the safe direction is to describe the behaviour differently, not to quote it.

---

## 6. Open questions for our implementation

1. **What is our known set, and who owns it?** The pre-classifier is only as good as its fixed label list. Which intents are the "known kinds" for a courier — and what is the process for adding one, so the list does not quietly become the whole product?
2. **Where is the bar, and how do we measure it before shipping?** One shared confidence threshold, or per-surface bars with a shared floor? And what offline evaluation set do we use to place it, given that the bar is the difference between "helpful" and "asks constantly"?
3. **How many questions in a row is too many?** What is the escalation budget after which we hand the step to the user rather than asking again — and what does the courier see at that point, mid-shift, hands busy?
4. **How much state fits on a phone screen without becoming noise?** The technique's value is that the record is short and current. What is the cap, what is always shown versus one tap away, and what is the default view for someone who never opens it?
5. **Does silence-by-default suit a courier?** The source project's triage is deliberately biased toward not acting. For us, is the right default to stay quiet, to read it back in one line, or to queue it — and how does that differ between a delivery-critical event and a chat message?
6. **How do we log decisions without logging content?** Both the classifier's routing and the confidence bar need a record so the bar can be re-tuned and audited. What do we keep, for how long, and how do we keep it free of the spoken content and the address data we must not retain?
