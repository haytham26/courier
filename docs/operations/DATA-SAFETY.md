# Data safety - the Google Play Console answers

**Draft.** The answers below are what the app does today. The founder checks
them against the Play Console form before the first submission, because a wrong
answer here is a removal from the store, not a warning.

## The data the app collects or shares

| Type                                                   | Collected | Shared | Optional | Purpose                                    |
| ------------------------------------------------------ | --------- | ------ | -------- | ------------------------------------------ |
| Name                                                   | yes       | no     | yes      | the account and the run                    |
| Email address                                          | yes       | no     | yes      | the account and the login                  |
| User IDs                                               | yes       | no     | no       | the account                                |
| Address (for example the delivery address)             | yes       | no     | no       | the run                                    |
| Photos and videos                                      | yes       | no     | yes      | the proof of delivery                      |
| Voice and sound                                        | yes       | no     | yes      | the voice commands and the voice assistant |
| Location (for example the position of the van)         | yes       | no     | no       | the route, the map and the stop list       |
| Crash logs and diagnostics                             | yes       | no     | no       | the crash reports and the support          |
| App activity (for example the app interactions)        | no        | no     | no       | nothing is collected                       |
| App info and performance (for example the app version) | yes       | no     | no       | the crash reports and the support          |
| Device or other IDs                                    | yes       | no     | no       | the session and the support                |

The data is encrypted in transit (TLS 1.3) and encrypted at rest. The data is
deleted when the run is deleted, and the account data is deleted within 30 days
of the request.

## The security practices

- the data is encrypted in transit,
- the data is encrypted at rest,
- the user can ask for the data to be deleted,
- the account can be deleted from inside the app and from the web,
- the data is not shared with third parties for advertising.

## The permissions and the declarations

- `ACCESS_BACKGROUND_LOCATION`: declared, with the video and the in-app
  disclosure. The answers are in
  `docs/operations/PLAY-PERMISSIONS-DECLARATION.md`.
- `RECORD_AUDIO`: the voice commands. The disclosure is in the app before the
  permission is asked for.
- `FOREGROUND_SERVICE`, `FOREGROUND_SERVICE_LOCATION` and
  `FOREGROUND_SERVICE_MICROPHONE`: the route and the voice assistant keep
  running with the screen off.

## The Play Console answers that still need the founder

- the data deletion URL (the web link next to the in-app deletion),
- the privacy policy URL (the address the listing points at),
- the content rating questionnaire,
- the target audience and the ads declaration,
- the app access instructions for the reviewer (there is no login needed for the
  app to open, and the account deletion is in the settings).
