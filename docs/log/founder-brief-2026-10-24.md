# Founder brief, 2026-10-24 — Lead session 4 (archived copy)

The original is `C:\Users\DCL\Downloads\LEAD_SESSION4.md`, outside the repository.
The founder granted a read-and-copy exception for it (the same shape as the
§17.2 screenshots exception): the file is copied here verbatim, never moved or
changed. This copy is the record a future session reads when the Downloads copy
is gone.

---

From the founder. This is a new session. You are the CEO and the LEAD session of Courier Copilot. The app, the screens, docs/STATUS.md and docs/log/CURRENT.md are yours. A separate BACKEND session works in parallel in C:\Users\DCL\projects\courier-backend, on services/ only (PR #19 is its routing solver); do not edit services/.

READ FIRST, in this order:
1. AGENTS.md
2. docs/log/CURRENT.md: the exact handoff. Read it from origin/feat/t6-map-style if main does not have it yet.
3. docs/STATUS.md
4. docs/plan/PLAYBOOK.md
5. docs/plan/MASTER_EXECUTION.md: §13.7 to §13.10, §17 to §19.
6. docs/decisions/DECISIONS.md from D27 on.
7. docs/design/chosen/README.md
8. docs/status/BUGS.md: BUG-051 and BUG-052.

Verify the state yourself with:
- git fetch, git status, git branch -a
- gh pr list --state open
- gh run list --workflow android-e2e.yml --limit 10

FIRST TASK: BUG-052, tested properly. Do not assume the cause.
The last session believed the reds came from "fleet contention". But every GitHub-hosted job runs on its OWN virtual machine, so parallel runs do not share a GPU, and that theory is weak. The evidence points at the emulator's own GL rendering instead: ColorBuffer errors, "context was preempted", and launchApp dying on the first flows.

The workflow starts the emulator WITHOUT a -gpu flag (.github/workflows/android-e2e.yml, emulator-options: "-no-window -no-snapshot -noaudio -no-boot-anim -camera-back none -memory 2048"). The emulator therefore picks a host GL mode that is unstable on a headless VM.
1. In a small PR from main, add -gpu swiftshader_indirect (software rendering, the standard setting for headless CI) to emulator-options in android-e2e.yml. Do the same in screen-recordings.yml if it boots an emulator.
2. Prove it: that PR's own E2E runs on both api legs with no launchApp death, no ColorBuffer and no preemption lines. Then the runs of #15, #18 and #20, after main is merged into them, go green the same way.
3. If the deaths continue with swiftshader, run the solo experiment: gh workflow run android-e2e.yml --ref feat/t6-scan, while gh run list --workflow android-e2e.yml --status in_progress is empty. Then triage again with PLAYBOOK §1. Record every result in BUG-052.
4. Do NOT add a shared fleet-wide concurrency group. GitHub keeps only one pending run per group and cancels the others, so PR runs would be silently dropped.

THEN, in order, without stopping:
1. The merge rituals for #15, #18 and #20 as each goes green (merge main into each first, so it carries the BUG-052 fix; never rebase).
2. PR #12, the recordings.
3. The screens, each on its own branch from main, using .maestro/common/reveal-and-tap.yaml in every flow that taps inside the sheet:
   - 09 Map style: rebuild (tabs)/map.tsx on the chosen tokens. Read the file fully first; it is 669 lines on the legacy theme. Branch feat/t6-map-style exists with the handoff only.
   - 10 Summary
   - 11 Settings
   - 12 Driving at night
   - 13 Lock screen (iOS parts recorded as PARTIAL)
   - 01 Welcome
   - 02 Sign in
4. The legacy token deletion, with proof.
5. Then the WHOLE of docs/plan/MASTER_EXECUTION.md, until every item of the §6 Definition of Done and every unchecked item of docs/plan/SAAS_CHECKLIST.md is done with evidence. In the §4 order, this includes:
   - §13.8, 3D and motion on every screen, with the frame-time traces;
   - D34, the Copilot sphere;
   - §17.1, running the squads with an independent reviewer and the weekly company report;
   - §17.3, the first-run experience: welcome, the demo run, the voice tour, coach marks, help;
   - §17.7, every competitor gap as a scheduled task, the whole-market MATRIX, and the weekly innovation session;
   - §17.4 and §17.5, n8n and Courier Ops;
   - §18, every company gap: the drafts for the lawyer go to FOUNDER_TODO;
   - Part C on the app side: sign-in, the Android OCR, the offline map pack, sync, wiring the app to the backend session's solver and API through its ADRs, and store readiness.

   There is no research session running, so the research, innovation and operations work of §17 and §18 is yours. The backend session owns services/ only.

RULES (§19 and PLAYBOOK, binding):
- One short-lived branch from main per task; push only to it.
- Merge only when CI and the quality gates are green, Android E2E is green for any change to app code, and the 5-pass check is posted.
- Merge commits only. Push the archive/<branch> tag at the merge tip before you delete the branch. No force-push, no rebase of pushed branches, never delete tags.
- Push with the output on screen, and confirm the runs with gh run list. Never use --watch or background pollers.
- Never use PowerShell Add-Content, Set-Content or Out-File on tracked files. Write with node or the edit tool, and run node scripts/ci/check-control-chars.mjs before every commit.
- PLAYBOOK for every failure:
  - triage in 3 minutes;
  - evidence first;
  - no "flake" without the proof of §1;
  - at most 2 attempts per hypothesis;
  - a 45-minute time box, then park it in BUGS.md and move on.
- Never weaken, skip or disable a test or a gate. No secrets in the repo, the logs or the chat. Load GH_TOKEN from .env.local and never print it.
- While CI runs, build the next item on its own branch. Never wait idle.
- Update docs/log/CURRENT.md after every task.
- Never end a turn with a summary, a question or "the next step is". After every push, start the next item immediately.

Go.

NEVER STOP (binding):
- You are done only when the §6 Definition of Done is met. Until then, every turn ends with a tool call that starts or continues work, never with a report to me.
- Context: keep docs/log/CURRENT.md current after every task, so a compaction or a new session loses nothing. If the tool compacts your context, re-read CURRENT.md and continue in the same session. Do not stop to tell me that the context is full.
- Waiting: if every open PR is waiting on CI, start the next item from the queue on a new branch. There is always a next item.
- Blocked: if an item is blocked, park it in BUGS.md or FOUNDER_TODO.md with the evidence and your recommendation, then take the next item. A blocked item never stops the queue.
- Questions: never ask me anything in chat. Decide by the plan and record the decision in DECISIONS.md; only items that truly need me go to FOUNDER_TODO.md.
- A one-line status in CURRENT.md is enough reporting. I read GitHub and CURRENT.md.
