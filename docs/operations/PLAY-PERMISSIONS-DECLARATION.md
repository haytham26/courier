# Background location - the Play permissions declaration

**Draft.** The answers below are the draft for the Play Console form (App
content, App access, Background location). The founder fills in the form and
records the video; the answers here are the source of that text.

## Does your app request background location?

Yes.

## Why does your app need background location access?

Courier Copilot is a work tool for parcel couriers. The driver spends the day in
a van with the phone in the pocket, so the app has to keep working while the
screen is off:

- the map follows the van and the stop list keeps the order,
- the arrival times and the warnings (the next stop, the break, the traffic)
  reach the driver while driving,
- the run is recorded properly, so the end of day summary and the logbook
  kilometres are right.

Without the background location, the app would only work while the driver holds
the phone, which is the opposite of the point.

## Is the background location used for the app's main purpose?

Yes. The location is the core of the product: it is what turns a list of
addresses into a route the driver can follow without touching the phone.

## Do you provide a prominent in-app disclosure?

Yes. The disclosure is shown in the app before the location permission is asked
for, on its own screen, with a plain explanation of what is collected, why, and
how to stop it. The wording is in `apps/mobile/src/constants/legal.ts`
(`BACKGROUND_LOCATION_DISCLOSURE`).

## Do you provide a video that demonstrates the use of background location?

To be recorded by the founder (the founder item in `docs/FOUNDER_TODO.md`). The
video has to show:

1. the driver starting a run,
2. the permission request and the disclosure screen,
3. the phone in the pocket with the screen off, and the map still following the
   van,
4. the end of the run, where the location stops.

## Is the location used for advertising?

No. The location is never sold and never shared for advertising. It is not used
for analytics.

## Do you offer a way for the user to control the background location?

Yes: the driver ends the run and the location stops. The app does not collect
the location outside a run.

## The review notes

- The foreground service types are declared: `FOREGROUND_SERVICE`,
  `FOREGROUND_SERVICE_LOCATION` and `FOREGROUND_SERVICE_MICROPHONE`.
- The privacy policy is at https://courier.copilot.nz/privacy
  (the draft is in `docs/operations/PRIVACY-POLICY.md`).
- The data safety answers are in `docs/operations/DATA-SAFETY.md`.
