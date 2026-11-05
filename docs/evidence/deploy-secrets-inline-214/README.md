# Evidence — the deploy's secrets never reach a command line (BUG-214, audit item 3c)

**Step:** the 2026-11-05 audit's item 3c · **Branch:** `deploy-secrets-inline-214` ·
**Date:** 2026-11-05

## What was broken

`deploy.yml`'s deploy step interpolated the two smoke secrets directly into the
remote ssh command:

```yaml
ssh -i ~/.ssh/id_ed25519 "${USER}@${HOST}" \
  "cd /opt/courier/infra && bash smoke.sh --domain \"${{ secrets.COURIER_STAGING_DOMAIN }}\" --token \"${{ secrets.COURIER_SMOKE_TOKEN }}\""
```

A secret in an ssh **ARGV** is readable in the remote host's own process list by
any process on that host for as long as the command runs. GitHub masks a secret
in its own logs; it does not (and cannot) mask it in the host's `ps`. One quoting
mistake is a leak into a log as well.

## What landed

The two secrets move into the step's `env:` (where GitHub masks them) and travel
to the remote shell over **stdin**:

```yaml
env:
  STAGING_DOMAIN: ${{ secrets.COURIER_STAGING_DOMAIN }}
  SMOKE_TOKEN: ${{ secrets.COURIER_SMOKE_TOKEN }}
  APP_VERSION: ${{ github.sha }}
run: |
  printf '%s\n%s\n' "$STAGING_DOMAIN" "$SMOKE_TOKEN" | ssh -i ~/.ssh/id_ed25519 "${USER}@${HOST}" \
    'read -r domain && read -r token || exit 9; cd /opt/courier/infra && APP_VERSION='"$APP_VERSION"' bash smoke.sh --domain "$domain" --token "$token"'
```

The remote command's static half is single-quoted, so the local shell cannot
expand into it; the sha is the deliberate exception (it is not a secret). A
failed read exits 9 loudly — a smoke test run with an empty token would prove
nothing about an authenticated round trip.

`scripts/ci/check-deploy-secrets-inline.mjs` (a step in the `Floor guard` job)
holds the line: no secret in any command line, the two names in the step's env,
the pipe-and-read shape, the single quoting, and a `bash -n` parse of the run
block. Its 6-case test runs with the rest of `scripts/*/__tests__`.

## The proof (a stub ssh, both command shapes)

The deploy step's smoke invocation, run against a stub `ssh` that prints the
argv it was handed, with the two secrets given working values:

```
$ export STAGING_DOMAIN='staging.courier.example' SMOKE_TOKEN='smoke-token-4f9c2' APP_VERSION='f9781fb'
$ printf '%s\n%s\n' "$STAGING_DOMAIN" "$SMOKE_TOKEN" | ssh deploy@host \
    'read -r domain && read -r token || exit 9; cd /opt/courier/infra && APP_VERSION='"$APP_VERSION"' bash smoke.sh --domain "$domain" --token "$token"'

=== the argv ssh was handed (what the host's own ps would show) ===
  argv[0] = deploy@staging.example.invalid
  argv[1] = read -r domain && read -r token || exit 9; cd /opt/courier/infra && APP_VERSION=f9781fb bash smoke.sh --domain
  (no secret value in the argv)

=== the remote command after the local shell expanded it ===
  cd /opt/courier/infra && APP_VERSION=f9781fb bash smoke.sh --domain "$domain" --token "$token"
  domain read from stdin: staging.courier.example
  token  read from stdin: smoke-token-4f9c2
  (both values arrived over stdin, and neither is in any argv)
```

The old shape, against the same stub:

```
$ ssh deploy@host "cd /opt/courier/infra && bash smoke.sh --domain \"$STAGING_DOMAIN\" --token \"$SMOKE_TOKEN\""

=== the argv ssh was handed (what the host's own ps would show) ===
  argv[0] = deploy@staging.example.invalid
  argv[1] = cd /opt/courier/infra && bash smoke.sh --domain "staging.courier.example" --token "smoke-token-4f9c2"
LEAK: the secret VALUE reached the argv
```

(The stub exits 1 on the leak: the proof is falsifiable, not decorative.)

## Red first (PLAYBOOK §14)

```
$ node scripts/ci/check-deploy-secrets-inline.mjs   # the tree as it was
the deploy's secret handling is broken (…):
- run: line 22 interpolates a secret into a command line - readable in the host's own process list: …
- the deploy step's env: does not carry STAGING_DOMAIN: …
- the deploy step's env: does not carry SMOKE_TOKEN: …
(exit 1)
```

(The parser bug the first draft of the gate had — a `$`-anchored regex that
silently stops matching because the workflow files are CRLF — was found by
this very red: the gate complained about env keys it should have read.)

## Green

```
$ node scripts/ci/check-deploy-secrets-inline.mjs
check-deploy-secrets-inline: no secret is spelled into the deploy's command lines; the domain and the
smoke token travel through the environment and over stdin, read by the remote shell into variables

$ node --test scripts/ci/__tests__/check-deploy-secrets-inline.test.mjs
6 tests, 6 pass

$ node scripts/ci/check-workflows.mjs
check-workflows: 14 workflows … (the changed file included)
```

## Not claimed

The live deploy: the leg needs the OCI host and key (`FOUNDER_TODO.md`), so the
stdin shape is proven by the stub and the gate, not by a run against the real
host. The remote host's `ps` is not audited from here; the point of the fix is
that the values are never put in a place that needs auditing.
