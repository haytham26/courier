# Sign in and create account

The first screens of the app, before the courier has an account.

## 1. The job

Get the courier signed in, in as few taps as possible, on a phone that is
propped up in a van.

## 2. The layout

### Sign in

| Part               | Content                                         | Size          |
| ------------------ | ----------------------------------------------- | ------------- |
| Title              | "Welcome back"                                  | 34 pt         |
| Subtitle           | "Sign in to continue"                           | 20 pt         |
| The email field    | A label, a field, 56 pt tall                    | 17 pt / 20 pt |
| The password field | A label, a field, 56 pt tall                    | 17 pt / 20 pt |
| The primary action | **Sign In**, 72 pt                              | 22 pt         |
| The footer         | "Don't have an account?" and the link "Sign Up" | 19 pt         |

### Create account

The same, with a name field (optional), the email, the password, the
confirmation of the password and the primary action "Create Account".

The screen scrolls: at 200 % text the form is taller than the screen.

## 3. The states

| State        | What the courier sees                                                                                                                                                                                                                                                       |
| ------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Loading      | The primary action shows a spinner **and** keeps its label, so the courier knows what is happening. Nothing else on the screen moves. The spinner never stays for more than 300 ms on a normal connection; if the sign-in is slow, the button says "Signing in..." instead. |
| Empty        | Not applicable: the fields start empty and the labels say what belongs in them.                                                                                                                                                                                             |
| Error        | One plain sentence in a dialog: "Wrong email or password" and the action "Try again". The field that is wrong gets a red border and the message under it.                                                                                                                   |
| Offline      | "You are offline" under the button, with the action "Try again when you have a signal". The fields stay filled in.                                                                                                                                                          |
| Partial sync | Not applicable before the sign-in.                                                                                                                                                                                                                                          |
| Permission   | Not applicable: the sign-in asks for nothing. The microphone and the camera are asked for later, when the feature that needs them is used.                                                                                                                                  |

## 4. Day and night

- The sign-in follows the theme like every other screen: the paper
  `#F4F6F7` and white fields in the day, the paper `#0E1418` and `#1A242B`
  fields at night.
- The primary action is the accent of the theme: `#0B5CAD` with the white
  label (6.67:1) in the day, `#7CC4FF` with the ink `#0E1418` (9.89:1) at
  night.
- The link is the accent too, and it clears 4.5:1 in both themes.

## 5. The motion

| What                  | How                                                | How long |
| --------------------- | -------------------------------------------------- | -------- |
| The screen opens      | It is already there; there is no entrance movement | -        |
| The button is pressed | The fill fades by 12 %                             | 150 ms   |
| The error appears     | The message fades in under the field               | 150 ms   |
| Less motion           | Every movement above becomes instant               | 0 ms     |

## 6. The copy

| On the screen                          | Voice prompt (while driving)         |
| -------------------------------------- | ------------------------------------ |
| "Welcome back" / "Sign in to continue" | "Sign in" (2)                        |
| "Email"                                | -                                    |
| "Password"                             | -                                    |
| "Sign In"                              | "Sign in" (2)                        |
| "Don't have an account?" / "Sign Up"   | "Create an account" (3)              |
| "Create an account"                    | "Create an account" (3)              |
| "The passwords do not match"           | "The passwords are not the same" (6) |
| "Wrong email or password"              | "That did not work, try again" (6)   |

The messages are plain and short. The app never says "authentication
failed" and never shows a stack trace.

## 7. The accessibility

- The title is a heading (`role="heading"`).
- Every field has a visible label, and the label is the accessibility label
  of the field, so a screen reader reads "Email, edit box" and not "Edit".
- The password field says what it is: `autoComplete="password"` and
  `secureTextEntry`.
- The primary action is a button with the label "Sign In" and the hint
  "Signs you in". While it works, its state is "busy", so a screen reader
  says that it is busy.
- "Sign Up" and "Sign In" are links, not buttons, and they say where they
  go.
- The focus order: the email, the password, the primary action, the link.
- At 200 % text the fields grow, the screen scrolls, and the primary action
  stays 72 pt. The label of a field is never cut off.
- The password manager can fill the fields: the email is
  `autoComplete="email"` and the password `autoComplete="password"`.

## 8. The testIDs

| testID                                                                              | Used by                      |
| ----------------------------------------------------------------------------------- | ---------------------------- |
| `login-screen`                                                                      | `login.yaml`                 |
| `login-email`, `login-password`                                                     | -                            |
| `login-submit`                                                                      | -                            |
| `login-sign-up`                                                                     | -                            |
| `register-screen`                                                                   | -                            |
| `register-name`, `register-email`, `register-password`, `register-confirm-password` | `delivered.yaml`, `map.yaml` |
| `register-submit`                                                                   | -                            |
| `register-sign-in`                                                                  | -                            |

The Maestro flow asserts the whole text "Sign In" and "Don't have an
account?", so both keep their wording.

## 9. The evidence

- `sign-in-day.png`, `sign-in-night.png`, `sign-in-large.png`,
  `sign-in-200.png` in `docs/evidence/design/`.
