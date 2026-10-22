# The contracts of Courier Copilot

The interfaces between the parts of the product, in one place. Nothing here is code: it is the
contract the code has to keep.

| File | What it is |
|---|---|
| `openapi.yaml` | The HTTP contract of the API (`services/api`). OpenAPI 3.1. |
| `db/schema.sql` | The schema the API runs against: PostgreSQL 16 + PostGIS + pgvector. |
| `db/legacy-schema.sql` | The first schema of the repository (the drivers, the parcels, the entry-point learning trigger). It is history: the API does not read it. |

**Not started:** the generated types. The OpenAPI file and the schema are hand-written today; the
TypeScript and Python types are still written by hand next to the code they belong to. The
generated types land when the API surface stops moving.

## The rules

- A contract changes with a decision (`docs/decisions/DECISIONS.md`) and an ADR
  (`docs/decisions/adr/`), never with an edit to the file alone.
- Every endpoint carries the decision it comes from.
- The schema and the code are checked together: a query in `services/api/app/repo.py` that needs a
  table the schema does not have is a bug, and the schema is the one that says what the table is.
