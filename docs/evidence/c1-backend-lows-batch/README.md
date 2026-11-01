# The C1 lows batch (the backend squad's rows)

One PR, one branch (`c1-backend-lows-batch`), one register row closed per commit. Every
row is fixed at its root with a red-first test: the suite runs against `origin/main`'s
modules first and the output is quoted here, then the fix lands and the suite is green.
The lead's own lows (mobile, `.maestro`, the CI scripts) are on `fix/c1-lows-batch` (PR
#166) and are **not** in this file.

## The rows this batch closes

BUG-118, 119, 120, 135, 136, 138, 143, 144, 145, 155, 156, 157, 158, 159, and the new
**BUG-163** (the repository's own `docker-compose.yml` Postgres, whose image carries no
`vector` library).

## How each row was proven

| Row | The red before | The green after | The root it was fixed at |
|-----|----------------|-----------------|--------------------------|
| BUG-118 | the address-less stop answered `500 an internal error occurred`, twice | 520 passed | `app/locations.py`'s guarded derivation, shared by both callers |
