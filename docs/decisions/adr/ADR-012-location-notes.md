# ADR-012 — Location notes and door memory: a stable address identity, per-courier notes, and the authz that never guesses

- **Status:** accepted
- **Date:** 2026-10-25
- **Decides:** D39 (queue 2, item 4: the location-notes endpoints, the door-memory mapping, the cross-courier rules)
- **Builds on:** ADR-010 §2 (the stops API), `docs/archive/KICKOFF_PROMPT_EN.md` ("door memory: `delivery_event.stop_id → stops.location_id`, never nearest-neighbour"), `packages/contracts/db/schema.sql` (`door_memory`)

## Context

The contract has carried `GET/POST /locations/{location_id}/notes` as `x-status: planned` since the
audit, and the schema has a `door_memory` table that no code reads. The product needs the door
memory: the gate code, the side gate, the dog, the safe place — learned once, spoken at the door
next time.

Two questions had to be settled before the endpoints:

1. **What is a `location_id`?** The archive's design pointed at a LINZ address id. This repo has no
   LINZ table and no geocoder in the API; stops carry `address` text and `suburb`. A nearest-
   neighbour match is explicitly forbidden (it teaches the wrong door).
2. **Who can read a note?** `door_memory` is keyed by `courier_id`: the door memory is the
   courier's own working knowledge, not a shared directory. A team may later share it, but that is
   a product decision with its own consent story, not a default.

## Decision

### 1. The location identity is derived from the canonical address, deterministically

`services/api/app/locations.py`:

- `canonical_address(address, suburb)` — lower-case, punctuation collapsed, whitespace collapsed;
  `address|suburb` (suburb omitted when empty).
- `location_id_for(address, suburb)` — `uuid5(LOCATION_NAMESPACE, canonical_address(...))`, with the
  namespace `uuid5(NAMESPACE_URL, "courier-copilot/location")`.

The identity is stable across days and stops, needs no new table, and cannot collide by proximity:
two different addresses are two different ids, and the same address text is the same id. When LINZ
address ids land (the address-intelligence slice), `location_id` becomes the LINZ id for matched
addresses and the derived id stays the fallback for manual pins — the column and the endpoints do
not change shape.

`stops.location_id uuid NOT NULL` stores the derived id, written by whoever creates the stop (the
intake slice; the seeds today). The stop response exposes `location_id`, so the phone never has to
recompute the hash — it reads the id the server will honour.

### 2. The endpoints

- `GET /locations/{location_id}/notes` — the caller's notes for the location, ordered by kind.
- `POST /locations/{location_id}/notes` — upsert by `(courier_id, location_id, kind)`: **201** when
  the kind is new, **200** when the note is corrected (`body`, `confidence`, `last_confirmed`
  updated). One gate code per door, not five.
- Kinds: `entry`, `gate_code`, `hazard`, `safe_place`, `access`. `body` 1–500 characters,
  `confidence` 0–1 (default 0.5).

### 3. The authorization: the caller must have delivered to the location

A note is readable/writable only when the caller has at least one stop (in any of their runs) whose
`location_id` matches — `repo.courier_has_location(courier_id, location_id)`. A location the
caller has never had is **404**, not 403 and not an empty list: existence is never disclosed
cross-courier (the same discipline as every run/stop route).

Cross-courier semantics, tested explicitly:

- Courier B with a stop at the same address sees **B's own notes only** — A's gate code is not
  shared.
- Courier B without a stop at the location gets **404** on both verbs.
- The notes are keyed by `(courier_id, location_id, kind)`: two couriers at one door have two
  independent memories.

### 4. The schema

`door_memory` is redefined to the note shape (pre-launch: no production rows exist, and the schema
file is the source of truth; the CI DB suite applies it from scratch):

```sql
CREATE TABLE door_memory (
    id uuid PRIMARY KEY,
    courier_id text NOT NULL,
    location_id uuid NOT NULL,
    address_key text NOT NULL,
    kind text NOT NULL,
    body text NOT NULL,
    confidence real NOT NULL DEFAULT 0.5,
    last_confirmed timestamptz NOT NULL DEFAULT now(),
    UNIQUE (courier_id, location_id, kind)
);
```

`address_key` keeps the canonical text for audit and for the future LINZ migration. The unique key
is the upsert target, so the repository needs no read-modify-write race.

## Consequences

- The phone gets `location_id` with every stop and calls the notes endpoints with it; no address
  parsing on the device, no nearest-neighbour guess anywhere.
- A courier's door memory is private by construction (the key includes `courier_id`), and a
  location the courier has never visited is indistinguishable from one that does not exist.
- Team-shared door memory (a later product slice) needs a deliberate scope column and consent — not
  a silent widening of this query.
- The voice agent's "side gate, small box mid-rack" line can read these notes once the copilot WS
  is wired to the repo (BUG-059 backlog).

## Verification

- `tests/test_location_notes.py`: the authz matrix, the upsert semantics, validation, the
  cross-courier isolation, the stop response's `location_id` matching the endpoint's id.
- `tests/test_repo_db.py` (the `db` marker): the SQL upsert and `courier_has_location`.
- The contract drift guard: both paths served, operationIds reconciled.
