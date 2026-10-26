# ADR-015 — The auth password policy: a real maximum, the breached corpus by k-anonymity, and the email lane still honestly closed

- **Status:** accepted
- **Date:** 2026-10-25
- **Decides:** the BUG-058 password rows (queue 2's ASVS V2.1.12: the password policy)
- **Builds on:** ADR-002 (Better Auth behind the API's JWKS), the ASVS V2.1 requirements, the `haveIBeenPwned` plugin of Better Auth 1.7.10

## Context

The sign-up flow accepted any password from 8 characters up to whatever the request body could
carry. Nothing checked the password against the breached corpus. The auth audit (BUG-058) filed
both gaps against the ASVS V2.1.12 row, and also the email-verification option.

The two halves of that audit have different horizons, and confusing them is how a product ends
up claiming a control it does not have:

- **The password policy** is fully in our hands: Better Auth already carried the knobs
  (`emailAndPassword.maxPasswordLength`, and a `haveIBeenPwned` plugin that checks the corpus by
  k-anonymity — only the first five characters of the SHA-1 ever leave the server).
- **Email verification** needs a sender we do not have: no email lane exists, and switching the
  option on with no sender would refuse every sign-up. It stays OFF and says so.

## Decision

### 1. A real maximum, from the environment

`AUTH_MAX_PASSWORD_LENGTH` (default 128) plumbs to `emailAndPassword.maxPasswordLength`. The cap
is the control: without it, a megabyte body is hashed on every sign-up, which is a denial of
service the password policy quietly invited. A longer passphrase is refused with the same honest
error as a short one.

### 2. The breached-password check is on, and it never leaves the server in the clear

`AUTH_HIBP_ENABLED` (default on) enables the `haveIBeenPwned` plugin on sign-up. The check sends
only the five-character SHA-1 prefix and compares suffix counts locally — the corpus's
k-anonymity range API. A breached password is refused at sign-up with the plugin's
`PASSWORD_COMPROMISED` code, and a deployment without the service switches it off explicitly
(`AUTH_HIBP_ENABLED=false`) rather than failing open by accident.

### 3. The suite stubs the range API, and proves the shape

`src/__tests__/setup.ts` intercepts `https://api.pwnedpasswords.com/range/…` and answers in the
real shape (35-character suffixes and a count). The password-policy suite asserts the maximum
and minimum, the refusal of a breached password, the acceptance of a fresh one, the
**five-character prefix actually sent** (the k-anonymity property itself), and the off switch.
The honest gap recorded here: the stub proves the protocol, not the corpus — a live check
against the real corpus belongs in the staging smoke plan, not in a unit test that must never
depend on a third-party endpoint.

### 4. The email lane stays closed, and the option stays off

`AUTH_REQUIRE_EMAIL_VERIFICATION` remains, tested, and OFF by default: no email-sending lane
exists (BUG-058's remaining row). The config, the option and the message are the honest
inventory of a control waiting for the founder's provider decision.

## Consequences

- Sign-up is bounded and checks the corpus; the ASVS V2.1.12 row closes except the email lane.
- The check adds one outbound call per sign-up (a rare, foreground action), not a per-request
  dependency: an unreachable corpus would fail the sign-up, which is the safe direction.
- The founder's remaining decision is an email provider; when it lands, the verification option
  turns on with a sender behind it.

## Verification

- `services/auth/src/__tests__/password-policy.test.ts`: the length bounds from the environment,
  the breach refusal, the fresh acceptance, the k-anonymity prefix, the off switch.
- `src/__tests__/setup.ts`: the range stub, the recorded prefixes, the SHA-1 helper.
- Full auth suite green (68 tests), lint and build clean.
