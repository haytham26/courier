# The dictation report

What the app says back after the courier dictated a run of stops. The mockup
is `Dictation.dc.html`.

## 1. The job

Tell the courier what was understood, what was changed, and what still needs
an answer - in one screen they can read in ten seconds.

## 2. The layout

| Part             | Content                                               | Size                  |
| ---------------- | ----------------------------------------------------- | --------------------- |
| The header       | "Dictation finished"                                  | 19 pt                 |
| The headline     | "212 stops added"                                     | 34 pt                 |
| The summary      | "I fixed 3 and need you to check 1."                  | 20 pt                 |
| The three counts | Matched, Corrected, Check                             | 28 pt                 |
| The corrections  | One card per correction                               | 20 pt / 16 pt / 17 pt |
| The question     | One question per unresolved item, with the options    | 20 pt                 |
| The answer       | "Or just say it."                                     | 17 pt                 |
| The actions      | **Accept all** (72 pt) and "Undo" on every correction | 72 pt                 |

A correction is one card: the original struck through, the correction, and
the reason in one short line ("Spelling · official LINZ name", "Number 1400
does not exist on this street").

An unresolved item is one question with two or three big options, each
56 pt tall, and the line "Or just say it." - the answer can be spoken, and
that is the point of the screen.

## 3. The states

| State        | What the courier sees                                                                                                                                                                                |
| ------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Loading      | The report appears when the dictation is finished. While it is still being worked through, the screen shows a skeleton card per line and the headline "Working through it". No spinner after 300 ms. |
| Empty        | "Nothing was dictated" and "Say the stops when you are ready".                                                                                                                                       |
| Error        | "Could not finish the dictation" and the action "Try again". The stops that were understood are kept, and the screen says how many.                                                                  |
| Offline      | The chip: "Offline · the report is on this phone". Every correction can still be accepted; the sync waits.                                                                                           |
| Partial sync | The chip with "retry".                                                                                                                                                                               |
| Permission   | The microphone: one line, "The microphone is off, so the dictation is not listening", and the next step is the system setting.                                                                       |

## 4. Day and night

- The night theme is the mockup: the background `#0E1418`, the cards
  `#172026`, the ink `#F2F5F7`, the second ink `#9FB0BA`.
- The day theme is the same structure in the day palette: the paper
  `#F4F6F7`, the cards white, the ink `#11181C`.
- The three counts keep the colour of the mockup: the green `#5BD38A` for
  the matched, the blue `#7CC4FF` for the corrected, the amber `#F2B04B` for
  the check. Every one of them clears 4.5:1 on the card, and the number is
  also in the label below it, so the meaning is never carried by the colour
  alone.
- The question card is the amber card of the mockup (`#2A2416` at night), and
  the "please check" heading is the amber ink.

## 5. The motion

| What                     | How                                                                  | How long                 |
| ------------------------ | -------------------------------------------------------------------- | ------------------------ |
| The report appears       | The cards fade in from the top, one after the other                  | 150 ms each, 50 ms apart |
| A correction is accepted | The card fades out and the count changes                             | 150 ms                   |
| A correction is undone   | The card comes back in place                                         | 150 ms                   |
| The question is answered | The card fades out                                                   | 150 ms                   |
| Less motion              | Every movement above becomes instant, and the cards appear together. | 0 ms                     |

The one-after-the-other arrival is the only staggered movement in the app,
and it is the only one that is not a transition.

## 6. The copy

| On the screen                            | Voice prompt (while driving)          |
| ---------------------------------------- | ------------------------------------- |
| "Dictation finished" / "212 stops added" | "I added 212 stops" (4)               |
| "I fixed 3 and need you to check 1."     | "Three were fixed, one needs you" (6) |
| "Matched" / "Corrected" / "Check"        | "What did you correct" (4)            |
| "Spelling · official LINZ name"          | "Why did you change that" (5)         |
| "Smith Street - which suburb?"           | "Redwood" (1)                         |
| "Or just say it."                        | "Say the answer" (3)                  |
| "Accept all"                             | "Accept all of it" (4)                |
| "Undo"                                   | "Undo that change" (3)                |

Every voice prompt is at most eight words. The corrections are explained in
one short line, never in a paragraph.

## 7. The accessibility

- The headline is a heading (`role="heading"`).
- The struck-through original is read before the correction, and the reason
  is part of the same card, so a screen reader reads the whole story of the
  change.
- "Accept all" is the primary button, 72 pt, with the label "Accept all" and
  the hint "Accepts every correction".
- Every correction has its own "Undo" button, with the label "Undo" and the
  hint that says which change it undoes: "Undoes the change to 14 Harewood
  Road".
- The options of a question are buttons, 56 pt, and the question is a
  heading, so a screen reader reads the question before the options.
- The counts are read as "208 matched, 3 corrected, 1 to check".
- The focus order: the headline, the three counts, the corrections from the
  top down, the question, the options, "Accept all".
- At 200 % text the cards grow, the counts wrap under their numbers, and
  the options stack instead of sitting side by side. Nothing is clipped.

## 8. The testIDs

| testID                                                        | Used by |
| ------------------------------------------------------------- | ------- |
| `dictation-screen`                                            | -       |
| `dictation-matched`, `dictation-corrected`, `dictation-check` | -       |
| `dictation-card-<n>`                                          | -       |
| `dictation-undo-<n>`                                          | -       |
| `dictation-question-<n>`                                      | -       |
| `dictation-answer-<n>-<option>`                               | -       |
| `dictation-accept-all`                                        | -       |

## 9. The evidence

- `dictation-night.png`, `dictation-day.png`, `dictation-large.png`,
  `dictation-200.png` in `docs/evidence/design/`, compared against
  `Dictation.dc.html`.
