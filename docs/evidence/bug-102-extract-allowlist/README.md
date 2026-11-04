# Evidence — BUG-102: the map-pack extract URL is checked before it is fetched

**Step:** AUDIT item BUG-102 (the backend squad's own workflow, `map-pack.yml`) ·
**Branch:** `bug-102-map-pack-allowlist` · **Date:** 2026-11-04 ·

## What landed

`.github/workflows/map-pack.yml`'s extract step used to curl `EXTRACT_URL` as
given — any scheme, any host, and no link to the licence-authority
`source_id`. The fix ties the fetch to the registry:

- `scripts/data/build-pmtiles.mjs` exports `checkExtractUrl(sourceId, url)`:
  the URL must parse, arrive over **https**, and come from the host the registry
  itself registers for that source (`geofabrik-nz` → `download.geofabrik.de`).
  An unregistered source, a foreign host or a cleartext URL is refused **by
  name**, fail closed. The registry is the licence authority, so a source with
  no checked terms cannot be fetched at all.
- The workflow's extract step calls `--source "$source" --check-url "$url"`
  **before** the curl, with the same `github.event.inputs.source_id` context
  form the rest of the workflow uses, so the licence gates (the plan step) and
  the fetch now agree on one source. The default Geofabrik URL is checked too —
  the check runs on the effective URL, not only on a dispatch-supplied one.

## Red first (PLAYBOOK §14)

```
$ node --test scripts/data/__tests__/build-pmtiles-contract.test.mjs
✖ the registered extract host is accepted      # checkExtractUrl does not exist
✖ a foreign host is refused, by name
✖ a cleartext scheme is refused
✖ a URL that is not a URL is refused
✖ a source outside the registry has no checked terms
✖ the workflow checks the URL before it curls it
```

## Green

```
$ node --test scripts/data/__tests__/build-pmtiles-contract.test.mjs
ℹ tests 6   ℹ pass 6   ℹ fail 0

$ node --test "scripts/*/__tests__/*.test.mjs"
ℹ pass 151  ℹ fail 0   (2 skipped, pre-existing)

$ node scripts/data/build-pmtiles.mjs --source geofabrik-nz \
    --check-url https://download.geofabrik.de/australia-oceania/new-zealand-latest.osm.pbf
build-pmtiles: the extract URL is allowed (download.geofabrik.de, source geofabrik-nz)   # exit 0

$ node scripts/data/build-pmtiles.mjs --source geofabrik-nz --check-url https://example.com/x.pbf
build-pmtiles: the extract URL is refused (the host "example.com" is not the registered
host "download.geofabrik.de" of source "geofabrik-nz")                                    # exit 1
```

## Gates

| Gate | Command | Result |
|---|---|---|
| contract tests | `node --test scripts/data/__tests__/…` | 6 passed (red first) |
| all scripted tests | `node --test "scripts/*/__tests__/*.test.mjs"` | 151 passed, 0 failed |
| registers | `node scripts/ci/check-parity.mjs --base origin/main` | clean; BUG-102 → fixed |
| floor / mojibake / conflicts | `check-floor.mjs`, `check-mojibake.mjs`, `check-conflict-markers.mjs` | clean |
| CI | the PR's checks | see the PR |

## Not claimed

The workflow is not executed here (it downloads a ~400 MB extract and builds a
pack): what is proven is the check's behaviour and the workflow's shape, pinned
by the contract test. The registry itself is unchanged — `geofabrik-nz`'s terms
are still the ones read on 2026-10-21 and still flagged `hostTermsVerified:
false`, which is the operator's step before the first production build.
