# Security Squad - benchmark

**The harness does not exist yet.** The rule of the squads (V4 §10) is that the benchmark is
built **before** the library is chosen, so the choice is measured rather than argued. For the
auth service the research (`docs/research/2026/auth-better-auth-ecosystem.md` §7) already named
the eight sets that have to exist:

| File | Contents | Gate |
|---|---|---|
| `session-lifecycle.jsonl` | signup, verify, sign-in, refresh, sign-out, device loss | one state change per step |
| `tenant-isolation.jsonl` | N tenants x M users x K resources | 404/403, never a leaked row; 0 leaks |
| `rate-limit.jsonl` | the credential endpoints under a burst, IPv4, **IPv6 prefix rotation** and proxy traffic | 0 bypasses |
| `rotation.jsonl` | sign with key A, rotate, sign with key B, verify both | both keys verify during the overlap |
| `offline-revoke.jsonl` | a driver loses the phone mid-shift | the app shows a **locked** state, never a "logged in" state it cannot prove |
| `locked-device.jsonl` | the app is woken while the phone is locked | the session cookie is readable (the `AFTER_FIRST_UNLOCK` fix) |
| `deep-link.jsonl` | the OAuth callback opened from a mail client | the deep link is reached |
| `a11y-i18n.jsonl` | the error messages in the pilot languages | every code localised |

The set belongs to `docs/squads/payments/eval/auth/` (the payments squad owns the account and the
entitlements). Until it exists, the squad's numbers are the test counts and the coverage, and
this file says so rather than pretending there is a benchmark.
