# ACCEPTANCE_TEST — the 30 minutes on a real phone

The audit's A6, done when the founder's first pass is recorded in
`docs/status/FOUNDER_TODO.md`. Everything below runs on a phone in a van, with
the app the CI built, and each step says what a pass looks like — write down
anything that does not match, that is the point of the exercise.

**Before you start (10 minutes, once):**

1. Install the app. The release APK of every merge to `main` is attached to one
   stable link: **https://github.com/haytham26/courier/releases/download/latest/courier.apk**
   (an unsigned build is named `courier-unsigned.apk` on the same page). On the
   phone: Settings → allow installs from this source, open the link, install.
   If the link 404s, the APK job skipped: the repository variable
   `EXPO_PUBLIC_AUTH_URL` is not set, so no build can name the auth server it
   dials — set it (Settings → Secrets and variables → Actions → Variables) to
   the URL of the auth service the app should use, then re-run the workflow.
2. Have a courier account. The app signs in through the auth service; the
   email way in (below) is the one that works everywhere.
3. Put the phone in the van mount, or hold it. The app is voice-first: most of
   the run below is done hands-free or one-tap.

**The run (about 25 minutes):**

## 1. Sign in (2 min)

- Open the app. The first screen asks permissions only when it needs them.
- Expected: the **Welcome** screen, with a way to **Sign in**.
- Tap Sign in. Expected: the **Sign in** screen — "Sign in", "Use the account
  you drive with.", the four ways in (Apple, Google, Passkey, Email), and a
  plain reason under any method the service does not offer.
- Tap **Email**, then the email field, type the courier's address, tap the
  password field, type the password, tap the primary action.
- Expected: you land on **Today** — the map is the backdrop and the glass sheet
  carries the day: the morning brief line, the three numbers, the next stop
  with its **Go**, and the day's actions.

## 2. Load the run (2 min)

- Expected: the day's stops are listed, in the run's own order, with the real
  addresses. A stop that reads "To go" is not delivered; one marked "Done"
  carries the minute it was delivered.
- Pull the sheet down and up (or use the grabber). Expected: the whole list
  scrolls, and the stop you tap opens its detail sheet with the address.
- Note: this is the real run from the server (A1). If the list is empty or the
  app shows no signal for a long time, that is a defect — write it down.

## 3. Scan a label (3 min)

- Open the **Scan** tab. Point the camera at a parcel label.
- Expected: the scan overlay sees the label ("Address found. Hold steady." when
  it has it) and **Done** closes the scan with the address on the day.
- A label it cannot read says so plainly; it does not freeze.

## 4. Voice (3 min) — needs the on-device models (A2)

- From **Today**, tap the voice button (or the Copilot on the driving screen)
  and say: *"next stop"*.
- Expected: the voice answers with the next stop, hands-free, and the app shows
  what it heard.
- Say *"mark delivered"* on the stop the drive is at.
- Expected: the stop is marked Done on the list with the minute, and the event
  is recorded (it appears in the end-of-day summary).
- If the models are not on the phone yet, the app says what it needs instead of
  failing silently — write that message down, A2 ships the models.

## 5. Drive to a stop and deliver it (5 min)

- Tap **Go** on the next stop. Expected: the **Driving** screen with the turn
  instruction and the map on the run's own day.
- Arrive at the address. Slide to Deliver.
- Expected: the stop leaves the list as Done, with the minute the run recorded,
  and the same mark is visible on **Today** — one mark, one fact.

## 6. The offline stretch (5 min)

- Put the phone in airplane mode. Deliver the next stop: slide to Deliver.
- Expected: the app does not complain, does not spin, does not lose the stop:
  it is Done on the phone and the event is held in the outbox.
- Turn airplane mode off.
- Expected: the held event goes out on its own, without you doing anything;
  the stop stays Done and the end-of-day summary counts it once.

## 7. End of day (3 min)

- From **Today**, tap **End of day**.
- Expected: the **Summary** screen with the day's numbers: stops delivered,
  earnings, the run's own durations.
- The count matches what you did on the phone — three online, one offline, one
  scanned — no stop counted twice, none missing.

## 8. The lock screen and the lock-out (2 min)

- Lock the phone and wake it on a stop's screen.
- Expected: the app is still on the stop, unlocked for you, and the courier's
  shift is on screen without a sign-in again (the session survives the gap).

**After the run:** write the result in `docs/status/FOUNDER_TODO.md`'s A6 row —
what passed, what did not, the phone model and the Android version. Anything
that did not pass becomes a row in `docs/status/BUGS.md` with the step it
failed on, and the CI's own no-mock E2E job (the a1 leg of the Android E2E
workflow) proves the same round trip against the real server on every merge.
