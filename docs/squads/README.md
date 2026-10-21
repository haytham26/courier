# Squads — one expert team per module

V4 §10: every core module has a squad that owns its research, its design, its decisions, its
evaluation dataset, its benchmark and its code. A module is **not** "done" until its benchmark
targets are met on the CI emulator and recorded.

| Squad | Mission | Code | Target source |
|-------|---------|------|---------------|
| [voice](voice/) | Always with you, all day: on-device STT/TTS/VAD/KWS, the live agent, every language | `apps/mobile/src/voice`, `apps/mobile/modules/voice` | V4 §10.1 |
| [scanner](scanner/) | A camera that only returns the delivery address | `apps/mobile/src/scanner` | V4 §10.2 |
| [address](address/) | Parser + D8 + LINZ index + door memory | `packages/nz-address`, `apps/api/app/address_correction.py` | V4 §10.3 |
| [routing](routing/) | Valhalla + VROOM + OR-Tools, templates and rules | `services/routing` (to be created) | V4 §10.3 |
| [maps](maps/) | PMTiles, styles, offline, turn-by-turn flag | `packages/map-style`, `infra/maps` | V4 §10.3 |
| [sync](sync/) | op-sqlite event log ↔ Postgres, conflict rules | `packages/sync`, `apps/api/app/sync` | V4 §10.3 |
| [design](design/) | The design system, motion and the visual gate | `packages/design-tokens`, `apps/mobile/src/components` | V4 §5 |
| [payments](payments/) | Better Auth, Stripe NZD, entitlements, teams | `services/auth`, `apps/api/app/billing` | V4 §10.3 |
| [security](security/) | The complete sign-in: Google, Apple, passkeys, email, MFA, the offline session, the biometric unlock | `services/auth`, `apps/mobile/src/lib`, `apps/mobile/app/(auth)` | MASTER_EXECUTION §14 |
| [web](web/) | Driver dashboard, dispatcher console, admin | `apps/web` | V4 §10.3 |
| [platform](platform/) | CI/CD, emulator E2E, OTA, observability, SBOM, releases | `.github`, `scripts`, `infra` | V4 §7, §10.3 |

## How a squad works

1. **Research** (V4 §3): ≥ 5–10 GitHub/official-doc candidates for its niche, written in
   `docs/research/2026/<area>.md`, with the decision and its fallback.
2. **Benchmark first**: the squad builds the evaluation dataset and the benchmark *before* choosing a
   library, so the choice is measured rather than argued.
3. **Own the targets**: the numbers in the squad's `STATUS.md` are the release gate. A regression
   blocks the merge (Release Manager role, V4 §1).
4. **Status**: each squad keeps a short `STATUS.md` — done with evidence, metrics vs targets, next,
   risks.
5. **Two reviews** for the critical squads (auth, payments, sync, address, voice, routing): the
   Code Reviewer role runs twice, once for correctness and once for security and edge cases.

## Squad status summary

See each squad's `STATUS.md`. The Release Manager blocks a merge when a squad's targets regress.
