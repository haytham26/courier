# Founder QA inspection of Courier Copilot

Run on 2026-11-12, 13:17 to 13:35 local time, on BlueStacks 5 (Android 13, 1080x1920, device language Arabic `ar-EG`, device time zone Pacific/Auckland). Driven by adb only. No code was changed.

The scheduled midnight run did not do this inspection: it started at 00:00 and stopped after 6 seconds with `Not logged in · Please run /login` (the `claude` command line was not signed in for unattended use). This inspection was run by hand in an interactive session afterwards.

## In plain words

**What works**

- The app installs, cold-starts in about 10 seconds and never crashed. The crash buffer stayed empty for the whole run.
- The Today screen, the Route list (To go / Later / Done), the map mode sheet, the map settings sheet and the Settings screen all open and respond.
- "Go" opens a driving screen with a distance, a street and the next street.
- A delivery can be recorded (by the slider, or by the Delivered button) and the counters move.
- "Fail" opens a reason picker with six reasons and a free-text note, and "Record failure" moves on to the next stop.
- Sign out (two taps) shows a sign-in screen. An empty email form is rejected with "Enter your email and password".
- The app keeps running in airplane mode and says honestly that the map has no tiles.

**What is broken**

1. **Nothing is saved.** After the app is closed and opened again, the run is back to 0 delivered / 5 to go. One delivery and one failure recorded minutes earlier were gone.
2. **Sign-out does not last and there is no real sign-in.** After signing out and restarting, the app opens straight into the run with no sign-in. Apple, Google and Passkey all say "not available right now".
3. **The voice assistant does not work at all.** The speech model `models/stt.onnx` is not inside the APK. The Copilot panel says OFFLINE, "Add by Voice" does nothing visible, and there is no way to type instead.
4. **The map is blank.** Only the numbered pins show, on a grey background. No map pack is in the APK and none is downloaded.
5. **Nothing reaches a server.** With working internet the app still says "There was no signal, so the delivery waits on this phone". Combined with item 1, the waiting deliveries are then lost.
6. **The app claims things that did not happen.** "Proof photo stored." appears without the camera ever opening. The scanner says "Address found … Matched to the map" while the camera picture is black. The Summary shows $438.20, 206 delivered, 92 km for a run of five stops.
7. **A failed delivery is counted as "Delivered"** (the counter went from 1 to 2 after "Record failure").
8. **Today and Route disagree.** Today showed 0 delivered and "next stop 2/14 Riccarton Road" while Route showed that stop as done (Done 1, To go 4). "Go to 2/14 Riccarton Road" then drove to Papanui Road, "Stop 2 of 5".
9. **On a right-to-left phone (Arabic) the deliver slider is backwards.** The knob is drawn on the right, but dragging the knob does nothing; only a left-to-right drag across the bar delivers.

**What is unclear**

- Whether this build is meant to be a demo with seeded data ("Driver", "Tane Rua", "Northwood AM", fixed stops). If it is, items 1, 2, 5 and 6 are "demo mode shown as real" rather than plain bugs, but nothing on screen says "demo".
- Whether the fake proof photo and fake scan are emulator fallbacks (BlueStacks has no camera here) or happen on a real phone too. Not tested on a real phone.
- Stop time windows read "22:00 - 00:00" and "23:30 - 02:00" and the break "01:00 - 02:00". These look like a time-zone conversion error, but the intended times are not known.
- Speaking to the assistant could not be tested (no microphone input through adb), and the app never asked for the microphone permission.
- "Open in nav app", Import, Optimise, Skip, Voice samples, Lock Screen and Face ID were not exercised.

## The APKs

| APK | Result |
|---|---|
| APK on the founder's Desktop | **No `.apk` file exists.** The Desktop is `C:\Users\DCL\OneDrive\Desktop` and holds only `Courier Copilot.lnk`, a BlueStacks shortcut that launches the already-installed package `com.courier.copilot`. The installed APK was pulled from the emulator and used instead. |
| Latest Main APK (`releases/download/latest/courier.apk`, `courier-unsigned.apk`) | **Does not exist.** Both URLs return HTTP 404 and the GitHub releases list for `haytham26/courier` is empty (`[]`). Not inspected. |

The one APK inspected:

- Name: `base.apk` of `com.courier.copilot`, pulled as `installed-from-desktop-shortcut.apk` (not committed, 116 MB)
- Size: 116,037,310 bytes
- SHA-256: `F6BCEB42425D2BF4B7F01CE17D619C2CE446868D49D664F69623327077FCD1E0`
- Version: `versionName=0.1.0`, `versionCode=1`, minSdk 24, targetSdk 36, first installed 2026-11-09 14:14
- Reinstalled with `adb install -r` (Success) before the run. App data was not cleared.
- Contents check: no `models/stt.onnx` and no `.pmtiles` / `.mbtiles` map pack anywhere in the 1,713 entries.

## Step table

Logcat files hold errors only (`*:E`). Almost every log also contains repeated `E courier.copilot: [SurfaceTexture-…] updateAndRelease: EGLConsumer is not attached to an OpenGL ES context`; that line is noise from the map view on the emulator and is listed once below (row 20).

| # | Screen | Action | Expected | What happened | Screenshot | Logcat line | Severity |
|---|---|---|---|---|---|---|---|
| 01 | Cold start | Force-stop, launch | Sign-in on a fresh start, then Today | Opens straight on Today as "Driver", 5 stops, no sign-in. Greeting says "Good morning" at 13:19. Layout is mirrored (Arabic device): "Rain 2 pm" chip sits under the map-style button; "Run actions" row is hidden under the tab bar | `01-cold-start.png` | `01-cold-start.log` (EGL noise only) | high (no sign-in), low (greeting, overlap) |
| 02 | Map tab | Tap Map | A map of Christchurch with the stops | Grey background with pins only. Sheet says "Canterbury offline map — No map tiles: the stops are still here — Offline" | `02-map-tab.png` | none | high |
| 03 | Map settings | Tap the top-left button | Settings sheet | Opens. Traffic, Road closures and Weather each say "not set up yet" | `03-map-style.png` | none | low |
| 04 | Map mode | Choose Satellite | Satellite imagery | "Satellite needs a network and a licence. Showing the flat map." The network was on. Attribution text is drawn underneath the tab bar and unreadable | `04-map-settings-closed-satellite.png` | none | medium |
| 05 | Route list | Tap Route | The same 5 stops as Today, none done | "To go 4, Later 0, Done 1" while Today says 0 delivered / 5 to go. Time ranges are drawn reversed ("00:00 - 22:00") and the windows are at night | `05-route-stops-list.png` | none | high |
| 06 | Route, Done | Tap Done | Empty | "2/14 Riccarton Road, done" although nothing had been delivered | `06-route-done-segment.png` | none | high |
| 07 | Today | Tap Today | Agree with Route | Still 0 delivered, 5 to go, next stop 2/14 Riccarton Road | `07-today-after-tabs.png` | none | high |
| 08 | Driving | Tap "Go to 2/14 Riccarton Road" | Driving to Riccarton Road | Driving screen for **Papanui Road, "Stop 2 of 5"**, 1.9 km. Blank map. "Open in nav app" label is blue on blue, nearly invisible. No Fail or Exit control on this screen. The accessibility tree still described the Today screen | `08-go-driving.png` | none | high |
| 09 | Slide to deliver | Drag the knob right-to-left (fast, then slow) | Delivered | Nothing happens | `09-slide-to-deliver.png`, `09b-slide-slow-left.png` | none | high |
| 09c | Slide to deliver | Drag left-to-right across the bar | (the knob is on the right, so this should not be the gesture) | "Delivered — 45 Papanui Road, 13:22", with Add proof photo / Undo / Next Stop | `09c-slide-left-to-right.png` | none | (works) |
| 10 | Proof photo | Tap "Add proof photo" | Camera opens, photo taken | No camera, no permission prompt. Text "Proof photo stored." appears. Camera permission was not granted at this point | `09d-slide-stepped.png`, `10-pod-photo-tap.png` | none | critical |
| 11 | Next stop | Tap Next Stop | Driving to the next stop | Driving to Blenheim Road, "Stop 3 of 5", 3.6 km | `11-next-stop.png` | none | (works) |
| 12 | Driving sheet | Swipe the sheet up | More actions (fail, skip) | Sheet does not expand; nothing more is offered | `12-driving-sheet-expanded.png` | none | medium |
| 13 | Voice (driving) | Tap the microphone | Listening | Copilot panel opens marked **OFFLINE**: "Say what you need, or tap Copilot to talk." No text box | `13-driving-voice-mic.png` | `E SherpaOnnx: Failed to resolve model path: Failed to extract asset file: models/stt.onnx. Tried direct copy and directory copy.` | critical |
| 14 | Voice | Tap the Copilot sphere | Listening, microphone permission prompt | Same error again, still OFFLINE, no permission prompt | `14-voice-tap-sphere.png` | same `SherpaOnnx` error | critical |
| 15 | Leave voice | Tap Stop | Back to driving | Back to driving | `15-today-after-deliver.png` | none | (works) |
| 16 | Leave driving | Android Back | Today, counters updated | Today: 1 delivered, 4 to go. Banner: "There was no signal, so the delivery waits on this phone and sends when the network comes back." The emulator had internet (ping to 8.8.8.8 ok). Next stop still says 2/14 Riccarton Road | `16-driving-back-key.png` | none | high |
| 17 | Today sheet | Swipe the sheet up | Run actions visible | Fail / Skip / Delivered now reachable. The sheet is see-through; map pins show through the text | `17-today-sheet-expanded.png` | none | low |
| 18 | Fail | Tap Fail | Reason picker | "Why did it fail?" with No access, Door locked, Nobody home, Parcel refused, Parcel damaged, Wrong address, and a note box | `18-fail-tap.png` | none | (works) |
| 19 | Fail reason | Choose "Nobody home", type a note | Selected | Selected and typed. The dialog is see-through, so the screen behind bleeds into its text | `19-fail-reason-nobody-home.png` | none | medium |
| 20 | Background | Escape key (BlueStacks sends the app to the background) | App pauses quietly | App goes to background. 540 identical error lines in a few seconds | `20-fail-recorded.png` (BlueStacks home, not the app) | `E courier.copilot: [SurfaceTexture-0-3444-0] updateAndRelease: EGLConsumer is not attached to an OpenGL ES context` | low |
| 21 | Resume | Reopen the app | Same state | Fail dialog still open with the reason and the note kept | `21-resume-from-background.png` | none | (works) |
| 22 | Record failure | Tap "Record failure" | Failed counted as failed | **"Delivered" goes 1 → 2**, "To go" 4 → 3. Next stop 120 Blenheim Road, still showing the notes "Side gate" and "Shelf B3" from the first stop | `22-fail-recorded.png` | none | high |
| 23 | Add by Voice | Tap "Add by Voice" | Listening or a text box | Nothing visible happens | `23-add-by-voice.png` | `E ReactNativeJS: 'Voice error:', [Error: the recognizer could not be started: java.lang.IllegalArgumentException: Failed to resolve model path: Failed to extract asset file: models/stt.onnx` | critical |
| 24 | Scan | Tap Scan | Camera permission prompt | System prompt for the camera (shown in Arabic) | `24-scan.png` | none | (works) |
| 25 | Scan | Allow "only this time" | Live camera, waits for a label | Black picture, yet "Address found. Hold steady. — 45 Papanui Road — Merivale. Matched to the map." Two "Done" buttons overlap at the top | `25-scan-camera-allowed-once.png` | none | high |
| 26 | Scan | Tap "Add and Scan Next" | Parcel added | Screen stays on the scanner | `26-scan-add.png` | none | unclear |
| 27 | Scan | Tap Done | Back to Today | Back to Today, counts unchanged | `27-scan-done-back-to-today.png` | none | (works) |
| 28 | Summary | Tap "End of day" | Today's real numbers (2 done of 5) | "Finished at 2:31 pm" (it was 1:27 pm), Earned today $438.20, 206 delivered, 8 not home, 92 km, NZ Post $212.40, Aramex $141.80, NZ Couriers $84.00 | `28-end-of-day-summary.png` | none | critical |
| 29 | Settings | Tap Account | The signed-in driver | "Tane Rua — Signed in with Apple" on an Android device that never signed in (Today calls the driver "Driver"). A DEBUG section "Voice samples (beta)" is visible. "Face ID" is listed on Android. Tab bar covers the last rows | `29-account-settings.png`, `30-account-settings-scrolled.png`, `31-settings-bottom.png` | none | high (false identity), low (rest) |
| 32 | Sign out | Tap Sign out once | Confirmation | Row changes to "Sign out? Tap again to sign out of this phone." | `32-sign-out.png`, `33-sign-out-second-tap.png` | none | (works) |
| 34 | Offline map | Tap "Offline Map" | A download screen | Jumps to the Map tab's mode sheet; no way to download a map | `34-offline-map-setting.png` | none | high |
| 35 | Back | Android Back, then tap | Back to Settings | Back lands on Today, not Settings | `35-privacy-policy.png` | none | low |
| 36 | Sign out | Tap Sign out twice | Sign-in screen | Sign-in screen. "Apple sign-in is not available right now", "Google sign-in is not available right now", "Passkeys are not available right now". Mentions "Face ID unlocks the app" | `36-sign-out-confirmed.png` | none | high |
| 37 | Sign in | Tap "Sign in with Google" | Google sign-in | Nothing happens | `37-sign-in-google-tap.png` | none | high |
| 38 | Sign in | Tap "Continue with Email" | Email form | Email and password form | `38-sign-in-email.png` | none | (works) |
| 39 | Sign in | Submit the empty form | Validation message | "Enter your email and password", button becomes "Try again". No real credentials were entered and no account was created, so a real email sign-in was not tested | `39-sign-in-empty-submit.png` | none | (works) |
| 40 | Restart signed out | Force-stop, launch | Sign-in screen; earlier work kept | **Today screen with no sign-in. Run reset to 0 delivered / 5 to go.** The delivery and the failure are gone | `40-cold-restart-signed-out.png` | none | critical |
| 41 | Offline | Airplane mode on, force-stop, launch | App opens and says it is offline | Opens normally, identical to online | `41-offline-airplane-on.png` | none | (works) |
| 42 | Offline deliver | Tap Delivered (run action) | Queued for sending | 1 delivered / 4 to go, "no signal … waits on this phone" banner. Next stop 45 Papanui Road, still with the notes "Side gate" / "Shelf B3" | `42-offline-mark-delivered.png` | none | medium (notes) |
| 43 | Online again | Airplane mode off, wait 15 s | Queued delivery sent, banner clears | Banner stays; nothing is sent | `43-online-again.png` | none | high |

Crash log: `adb logcat -d -b crash` was read after every step and was always empty, so no `*.crash.log` file exists.

## Best guess at the cause of each broken item

| Broken item | Best guess |
|---|---|
| Run resets after restart (40) | The run lives in memory and is re-seeded from fixed demo data on every start; nothing is written to local storage. |
| No sign-in on start, sign-out forgotten (01, 40) | No server URL or auth provider is configured in this build, so the app falls back to a seeded demo driver and never stores a signed-out state. |
| Apple / Google / Passkey unavailable (36, 37) | The sign-in providers are not configured for this Android build (no client IDs / no server). |
| "No signal" with internet, nothing sent (16, 43) | No server URL in the build, or the server is unreachable; every send fails and is reported as "no signal". |
| Voice dead (13, 14, 23) | Missing voice model: `models/stt.onnx` is not packaged in the APK (confirmed by listing the APK). Stack trace starts `java.lang.IllegalArgumentException: Failed to extract asset file: models/stt.onnx … at com.sherpaonnx.SherpaOnnxModule.resolveModelPath`, caused by `File not found after copying parent directory: models/stt.onnx`. |
| Blank map (02, 04, 34) | Missing map tiles: no Canterbury map pack in the APK and no download flow; the online fallback / satellite needs a licence key that is not set. |
| "Proof photo stored." without a photo (10) | The proof-photo handler stores a placeholder when no camera is available or the permission is missing, and shows the success text regardless. |
| Scanner "finds" an address from a black picture (25) | A demo or fallback result is returned when the camera gives no frames. |
| Fake Summary (28) | The Summary screen shows fixed sample numbers and is not connected to the run. |
| Failure counted as Delivered (22) | The counter counts every finished stop instead of only delivered ones (or the label is wrong). |
| Today and Route disagree; Go drives to another stop (05–08) | The two screens read different sources (seed data with stop 1 already done versus a separate "next stop" pointer). |
| Same notes on every stop (22, 42) | The "Side gate" / "Shelf B3" chips are fixed sample chips, not per-stop data. |
| Slider backwards, overlaps, reversed time ranges (01, 04, 05, 09, 25, 29) | The app follows the phone's right-to-left direction for layout, but the slider gesture and several absolutely positioned elements assume left-to-right. Seen only because this device is set to Arabic. |
| Odd time windows 22:00–00:00 (05) | Times stored as UTC or another zone and shown without converting to the run's time zone. |

## Limits of this inspection

- One APK only, on an emulator with no camera, no microphone input and no GPS movement.
- Only the Arabic (right-to-left) device setting was tested; the device language was not changed.
- Email sign-in with a real account, speaking to the assistant, a real photo, and a real scan were not tested.
- Skip, Import, Optimise, "Open in nav app", Voice samples, Lock Screen, Face ID, Privacy Policy and Terms were not opened.
- During the run the tester allowed the camera "only this time" for Courier Copilot, signed the demo driver out, and switched airplane mode on and then off again. Nothing else on the emulator was touched.
