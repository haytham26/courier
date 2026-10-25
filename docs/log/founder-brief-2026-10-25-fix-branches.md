# Founder brief, 2026-10-25 — "LEAD_FIX_BRANCHES" (archived copy)

The original is `C:\Users\DCL\Downloads\LEAD_FIX_BRANCHES.md`, outside the repository.
The founder granted a read-and-copy exception for it (the same shape as the
§17.2 screenshots exception and the 2026-10-24 Lead session 4 brief): the file is
copied here verbatim, never moved or changed. This copy is the record a future
session reads when the Downloads copy is gone.

---

From the founder. I checked GitHub myself. Two corrections, then continue the queue without stopping.

1. BRANCH CLEANUP. Your report says the merged branches were deleted, but they are still on GitHub. You most likely deleted only the local copies. I verified each one below against origin/main and the tags.

   Already MERGED into main AND archived with a matching archive/<branch> tag. Delete the remote branch:
   - feat/t6-scan
   - feat/t6-route
   - feat/t6-09-map-style
   - feat/t6-11-settings
   - feat/t6-12-driving-night
   - fix/bug-052-emulator-swiftshader-gpu
   - fix/audit-lead-findings

   NOT merged and NOT tagged. It is a stale stub whose only commit is an old CURRENT.md handoff (29843f2):
   - feat/t6-map-style: FIRST archive it, THEN delete the remote branch:
       git tag archive/feat/t6-map-style origin/feat/t6-map-style
       git push origin refs/tags/archive/feat/t6-map-style

   For EACH branch, one at a time, with the output on screen:
   a) git fetch origin --tags
   b) Merged ones: git merge-base --is-ancestor origin/<branch> origin/main must succeed. Every one: git rev-parse --verify refs/tags/archive/<branch> must print a commit.
   c) git push origin --delete <branch>
   d) git ls-remote --heads origin <branch> must print nothing.
   If a) to b) fails for any branch, do NOT delete it; record why in CURRENT.md.

   KEEP these. They are open or another session's work, so do not touch them:
   - feat/t6-copilot (PR #18)
   - feat/t6-10-summary (PR #30)
   - feat/t6-recordings (PR #12)
   - feat/pod-storage (PR #31, the backend session's)
   - main

   From now on, the merge ritual counts as done only after ls-remote shows the remote branch is gone. A report says "deleted" only with that proof.

2. BUG-061, PR #18 (SIGSEGV at cold start). The diff is "JS-only", but the D34 Copilot sphere renders through Skia, which is native GPU code, and the emulator now runs on software GL (swiftshader). Test that hypothesis FIRST, per PLAYBOOK §3 and §5:
   - Run the experiment on a SCRATCH branch cut from feat/t6-copilot, for example exp/bug-061-no-sphere. It is never merged, and it is deleted after the experiment (tag it archive/exp/bug-061-no-sphere first).
   - On that branch only, replace the Skia sphere with a plain View of the same size and testID. Do not use the reduced-motion path for this, because it may still render through Skia, and an EXPO_PUBLIC_ variable would be baked into any build. Then run the Android E2E on that branch with workflow_dispatch.
   - Compare the cold starts with the same flows on the same emulator.
   - If the crash disappears, the sphere is the cause. Fix it on feat/t6-copilot: make the shader path safe, or detect when Skia cannot use a GPU and draw the sphere with a simpler, safe renderer there. Then prove it with green runs on both api legs of PR #18.
   - If the crash stays, drop the hypothesis, record it in BUGS.md, and go to the APK bisect you planned.
   - Real devices with a GPU must still get the live 3D sphere. Never remove the feature to get green.

RULES that stay binding:
- Never use --force or --force-with-lease on a pushed branch; for a mistake, add a new commit.
- Check the current branch (git branch --show-current) before every commit and every push.
- Nothing is DONE in a report without GitHub proof: the run link, the merge commit, or ls-remote.
- PLAYBOOK for every failure, and the 45-minute time box.
- Local experiments live only in the temp folder outside the repo. An experiment that needs CI runs on a scratch exp/ branch: never merged, tagged and deleted afterwards (PLAYBOOK §3, §10).
- Never weaken a test.
- A new bug or decision takes the next free number from origin/main at that moment; check again before merging, because the backend session writes to the same registers.

Then continue: PR #30 (BUG-062: the deep-link experiment), PR #12 (recordings: merge main in, get it green, merge it, because it is the evidence that every screen matches its reference), the screens 13 Lock screen, 01 Welcome and 02 Sign in, the legacy token deletion, and then the rest of MASTER_EXECUTION until the §6 Definition of Done. Never end a turn with a summary or a question.
