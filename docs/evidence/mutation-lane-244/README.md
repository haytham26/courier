# BUG-244 evidence - killing tests for the voice service's surviving mutant classes

## The measurement
Run 42355509331 (head `34ecc95`): voice `{"killed": 400, "survived": 284, "total": 690, "no_tests": 6}` -> 58.0 % against the 70 % floor. The survivor dump (`mutmut-survivors.txt`, BUG-241) grouped by function:
`offline_brain._answer_of` 33, `_company_of` 31, `conversation._verbosity` 26, `_slots_of` 19, `_where_parcel` 16, `_when_done` 13, `_what_time` 13, `_repeat` 12, `_what_next` 12, `_where_am_i` 12, `safety.*` 29, `turns.*` 6, ... - i.e. the `question=`/`source=`/`engine=` kwargs, the empty-branch speech literals, and the reply-constructor fallbacks, none of which the existing tests asserted.

## Red first
10 representative survivor mutants hand-applied to `services/courier-voice/app/` (each exactly as the dump's diff shows): `question="repeat"`->None, `speech="that's the last stop."`->None, `_answer_of`'s `speech=""`->"XX", `should_close` `>=`->`>`, `word_count`'s regex->`XX[.!?;,]XX`, `real_word_count`'s `strip(".,!?;:").lower()`->`strip("XX.,!?;:XX").upper()`, `strip_screen_demands`' join->`"XX XX"`, `tidy`'s space-before-punct regex->XX, `_dynamic_speech`'s `== "where_am_i"`->`!=`, `_action`'s `"type"` key->`"XXtypeXX"`. New tests: **13 failures** across the new classes (the `"type"` key mutant raises pydantic's extra_forbidden at parse, which mutmut also counts as a kill). Reverted: 136 passed in the four files.

Two observability subtleties the first draft missed (the mutants survived it): trailing punctuation does not change `word_count` ("Street," is still one word) - only a STANDALONE punctuation mark does (`word_count("yes . no") == 2`); and the strip join only shows with two kept sentences (`strip_screen_demands("Delivered. Next is Kowhai Street. Tap the screen.")`). Both pins are in.

## The tests
- `tests/test_conversation.py::TestTheWholeAnswerContract` - 21 tests, full `Answer` equality (speech+question+action) for every handler branch incl. all empty branches (repeat with/without a last instruction, quiet, chatty, brief, last stop, between stops, parcel not in run / without van info, no eta, no time, correction's question).
- `tests/test_offline_brain.py::TestTheReplyContract` - 11 tests, full `ReasoningReply` equality for offline_reason (how-many-left, where-am-I at/between stops, chatter empty + chatty OFFLINE_LINES, small talk, empty transcript) plus direct pins of `_answer_of`, `_company_of`, `_question_of_action`, `_dynamic_speech`.
- `tests/test_turns.py::TestTheStateIsPinned` - 5 tests on opened_at/words/last_word_at/last_reply/history and the exact-timeout boundary (`>=`, not `>`).
- `tests/test_safety.py::TestTheCountersAndTheCleaners` - 5 tests pinning exact word_count / real_word_count / strip_screen_demands / tidy / quiet_reply outputs.

## Green
- Voice suite: **355 passed** (was 313). ruff + mypy clean on the changed files. All node gates pass; parity 0 reopened vs origin/main.
- Expected: the classes above (~260 of the 284 survivors) die on the next dispatch, taking voice from 58.0 % to ~90 %.
