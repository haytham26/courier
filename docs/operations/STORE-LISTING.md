# Store listing draft - Courier Copilot

The text that goes into the Play Console. The version lines have to match
`apps/mobile/app.json`, and `scripts/ci/check-store-readiness.mjs` fails when they
do not.

- App name: Courier Copilot
- App version: 0.1.0
- Version code: 1
- Package: com.courier.copilot
- Category: Navigation
- Privacy policy URL: https://courier.copilot.nz/privacy
- Content rating: everyone (the app has no user content and no purchases yet)
- Contains ads: no
- In-app purchases: none in this release
- Target audience: 18+ (the app is a work tool for adult couriers)
- Data safety: the answers are in `docs/operations/DATA-SAFETY.md`

## Short description (80 characters)

Voice-first delivery help for New Zealand couriers: route, stop list, POD.

## Full description (4000 characters)

Courier Copilot is the shift companion for an independent courier in New Zealand.

It keeps the run, the stop list and the map on one screen, and it takes your
voice commands so you can drive without touching the phone. Mark a delivery,
fail a stop with a reason, skip a stop, add a door note, ask what is next, or
ask what you earned today.

What it does:

- the route of the day, with the stop list that fits the way you work
- proof of delivery by photo, by signature or by voice
- door memory: the gate code, the side gate, the dog, the place to park
- the address correction that fixes a missing suburb or a wrong street number
- the earnings summary at the end of the day, with the kilometres for the logbook
- offline first: the whole run works without a signal and syncs when the signal
  comes back
- the live voice assistant that talks through the shift in your own language

Built for New Zealand: left-hand driving, NZ addresses, NZ Post and CourierPost
labels, and plain English that sounds like a person from here.

This is an early release. We would like to hear what is missing.

## The assets

- App icon: `apps/mobile/assets/icon.png` (1024 by 1024)
- Feature graphic: to be shot (founder)
- Phone screenshots: to be taken from the CI emulator (the design squad)
- The short description and the full description above are drafts for the
  founder to read through.

## The review notes

The app asks for the background location because the route has to keep working
with the screen off. The disclosure is shown in the app before the permission is
asked for. The declaration is in
`docs/operations/PLAY-PERMISSIONS-DECLARATION.md`.

The app has no account sharing and no in-app purchase, so the reviewer does not
need a test account. The account deletion is in the settings.
