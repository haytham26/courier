# Breach-response runbook — the 72-hour clock

**Date:** 2026-11-08 · **Law:** NZ Privacy Act 2020 — a notifiable privacy breach must
be notified to the **Office of the Privacy Commissioner as soon as practicable**, and
to affected individuals unless an exception applies (s 112–115; IPP 13). Our bar,
stricter than the statute: **decide within 4 hours of detection, notify the OPC within
72 hours of detection**, affected couriers within 72 hours unless the OPC agrees
otherwise. PARITY 213. This runbook extends RUNBOOK §10 (the incident process); where
they differ on a breach, this file wins.

## 1. What counts as a notifiable breach

Any unauthorised access to, or loss of, personal information that is likely to cause
serious harm — for us that means: courier account credentials (hashes, tokens, backup
codes), session tokens, run data (addresses, door notes, POD photos), voice transcripts,
GPS traces, or billing data. A ransomware or destructive event on the DB counts even
without exfiltration evidence.

## 2. The clock and the roles

| T+ | Action | Owner |
|---|---|---|
| T+0 | Detection (monitoring alert, courier report, ZAP/secret-scan finding, external report via `SECURITY.md`) | whoever sees it — **any courier or team member may declare** |
| T+0–1 h | Declare: page the founder (RUNBOOK §10 step 2). Contain: revoke sessions (S1-e), rotate the leaked secret (RUNBOOK rotation task), take the affected surface down or into read-only if exfiltration is ongoing | founder + on-call |
| T+1–4 h | **Decide**: is this a notifiable privacy breach? Assess scope: what data, how many couriers, what harm. Record the decision and the reasons in `docs/operations/incidents/` | founder + privacy officer (privacy@courier.copilot.nz) |
| T+4–24 h | Prepare the OPC notification (form: `privacy.org.nz` notifiable-breach form) and the courier notice: what happened, what data, what we did, what they should do, contact | founder + privacy officer |
| **T+72 h** | **OPC notified and affected couriers notified** (or the documented reason an exception applies: e.g. data was encrypted with keys not breached — SQLCipher/Keystore rows in the MASVS-L2 matrix are the evidence for that exception) | founder |
| T+5 d | Post-mortem (RUNBOOK §10 step 6, 48 h rule applies from containment, not detection) with action items, each with a test | founder |

## 3. Templates

- **OPC notification**: the OPC's online form + a copy to `security@courier.copilot.nz`
  for the record. Contents: agency contact, breach description, data types, number of
  affected individuals (NZ), steps taken, steps affected people can take, date of
  breach, date of discovery.
- **Courier notice** (email + in-app banner): plain language, no jargon: what
  happened, when, what information of theirs was involved, what we have done, what
  they should do (rotate password, sign out other devices via the session list),
  who to contact. No speculation about cause before the post-mortem.

## 4. Evidence we keep

Every breach (notifiable or not) gets a folder `docs/operations/incidents/<date>-<slug>/`
with the timeline, the decision record, the notifications as sent, and the post-mortem.
**No courier data goes into git** — the incident folder holds metadata and redacted
excerpts only (the floor rule: no PII in `docs/`).

## 5. Tabletop (part of the pen-test, PEN-TEST-CHECKLIST §2.6)

Once before v1.0.0, the founder walks this clock with a simulated token leak:
detection → declaration → containment (session revocation) → decision at T+3 h →
draft OPC notification → draft courier notice. The tabletop's output is a timed
record in the incident folder proving the 72-hour path is walkable, not just written.
