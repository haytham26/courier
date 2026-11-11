# Oracle Cloud setup — the staging host, click by click

**Read this once, top to bottom, and the deploy runs itself.** Every step says what
to click, what to copy, and where the value goes. Nothing here needs the terminal
except step 6 (which creates the SSH key you will paste into GitHub). The whole
thing is 30–40 minutes, most of it waiting for Oracle to boot one machine.

The app that lands on this machine: our API, the auth service, Postgres 16 with
PostGIS, the rate limiter's Valkey, and Caddy on the edge. It is the **staging**
environment (A5) — the founder's phone will talk to it through the Main APK
workflow, and the nightly smoke test watches it.

> **What this doc does NOT need from you:** a domain. Step 7 gives you two ways
> to get HTTPS — a free DuckDNS name today, or your own domain whenever you buy
> one. Caddy sorts the certificate either way.

---

## Step 1 — Create the Oracle Cloud account and start the Always Free VM

1. Go to <https://cloud.oracle.com> and sign in (create the account if you have
   not; the Always Free tier needs no card for the Ampere instances, though
   Oracle may verify by phone).
2. Top-right: pick the **Sydney, Australia** region (Australia East /
   `ap-sydney-1`). Sydney is the closest region to Christchurch — a Canterbury
   courier's packets cross the Tasman, not the Pacific.
3. Menu → **Compute → Instances → Create instance**.
4. Fill it in exactly like this:

   | Field | Value | Why |
   |---|---|---|
   | Name | `courier-staging` | the deploy's scripts print this name in logs |
   | Image | **Ubuntu 24.04** (Canonical Ubuntu, minimal is fine) | the packages the deploy installs are built for 24.04 |
   | Shape | **Ampere**, `VM.Standard.A1.Flex`, **4 OCPU / 24 GB RAM** | Always Free gives up to 4 OCPU + 24 GB; 24 GB is what Postgres + the API + Caddy like together |
   | Networking | **Create new virtual cloud network**, `courier-vcn`, with a public subnet | so the machine gets a public IP |
   | SSH keys | **Save private key** + **Generate a key pair for me** | you will upload the PUBLIC half to GitHub in step 6 |

   Everything else stays at its default. Boot volume 100 GB (Always Free allows
   up to 200 GB total across the account — 100 GB leaves room for backups).
5. Click **Create**. The instance takes 1–3 minutes to go `Running`. Write down
   the **Public IPv4 address** — step 6 needs it.

## Step 2 — Open the firewall for the web (Oracle's own two firewalls)

Oracle has TWO firewalls and both must say yes, or the site is unreachable.
People lose a day to this; do all five clicks.

**A. The instance's own firewall (iptables inside Ubuntu):**

6. In the instance page, bottom panel → **Console access** is not what you want.
   Instead: instance page → **Networking → Virtual cloud network** →
   `courier-vcn` → **Subnets** → your subnet → **Security List** (the default
   one) → **Add Ingress Rules**, twice:

   | Source CIDR | IP protocol | Destination port | |
   |---|---|---|---|
   | `0.0.0.0/0` | TCP | `80` | Caddy's HTTP → HTTPS redirect |
   | `0.0.0.0/0` | TCP | `443` | Caddy's HTTPS (the app) |

   (Leave port 22 open only from your own IP if you know it; `0.0.0.0/0` for 22
   works too — the SSH key in step 6 is what protects it.)

**B. Ubuntu's own ufw** — done for you by the deploy's bootstrap script (item 2
below). When the deploy first runs, it opens 22/80/443 and closes the rest.

## Step 3 — Point a name at the machine (or borrow one)

7. **With a domain** (if you own one, e.g. `courier.nz`): at your DNS provider
   add an `A` record: `staging` → the machine's public IP from step 1.
   TTL 300. Result: `staging.courier.nz`.
8. **Without a domain** (fastest path, free): go to <https://duckdns.org>, sign
   in, and claim a subdomain — e.g. `courier-staging.duckdns.org` → the public
   IP. That IS your hostname. You can move to your own domain later; the deploy
   only reads the name from a GitHub variable.
9. **Sanity check from your PC** (PowerShell):
   `Test-NetConnection -ComputerName <the name> -Port 443` should say
   `TcpTestSucceeded : True` **after** the first deploy. Before the deploy it is
   expected to fail — nothing is listening yet.

## Step 4 — The deploy user (the bootstrap does it; this is what it does)

The deploy never runs as `ubuntu` (the Oracle default user). The bootstrap
creates a locked-down deploy account with Docker access and passwordless sudo
removed. You do not do anything here — item 2 of the founder's directive lands
the bootstrap script, and it runs on the deploy's first SSH.

## Step 5 — A smoke-test token (how the nightly check logs in)

10. The smoke test posts a real demo seed and reads it back through a token.
    That token is a JWT signed by the auth service. The **simplest** source: the
    app itself. Once staging is up, the deploy prints a working token into its
    log (the smoke step generates one from the auth service's secret). Until
    then, leave this unset — the deploy's smoke step skips the authenticated leg
    with a notice and the public half still runs.

## Step 6 — Put the values into GitHub (this is the whole handover)

11. GitHub → `haytham26/courier` → **Settings → Secrets and variables → Actions**.
12. **Secrets** tab → **New repository secret**, one at a time (paste the value,
    no spaces, no quotes):

    | Name | Value | Where it comes from |
    |---|---|---|
    | `COURIER_STAGING_HOST` | the machine's **public IPv4** from step 1 (or the DNS name) | Oracle console |
    | `COURIER_STAGING_USER` | `deploy` | the bootstrap creates this account (step 4) |
    | `COURIER_STAGING_KEY` | the **private** SSH key from step 1 — the whole file, `-----BEGIN...-----` to `-----END...-----` | the `.pem` file you saved |
    | `COURIER_STAGING_DOMAIN` | the hostname from step 3 (e.g. `staging.courier.nz`) | your DNS / DuckDNS |
    | `COURIER_SMOKE_TOKEN` | the courier JWT from step 5 (optional at first) | the deploy log |
    | `COURIER_POSTGRES_PASSWORD` | a strong random password you invent (write it down: the backups are encrypted with it) | you |
    | `BETTER_AUTH_SECRET` | a second strong random string | you |
    | `ACME_EMAIL` | your email (Let's Encrypt expiry warnings for the free certificate) | you |

13. **Variables** tab → **New repository variable**, once:

    | Name | Value |
    |---|---|
    | `COURIER_DOMAIN` | the same hostname as `COURIER_STAGING_DOMAIN` (the edge publishes under it) |

    (The Main APK workflow reads its own `COURIER_STAGING_DOMAIN` — the same
    name you just set — so the moment it exists the APK points at staging.)

14. Done. **From here the deploy runs itself**: the next push to main (or
    `workflow_dispatch` on **Deploy staging**) builds the images, copies the
    compose files to the host, runs the migrations, starts the stack, and runs
    the smoke test. If the smoke test fails it rolls the previous images back by
    itself.

## Step 7 — Check it worked (2 minutes)

15. Open `https://<your hostname>` in a browser → you should get a connection
    error (the edge answers 404 for `/` by design) **over a valid certificate** —
    click the padlock; Caddy issued it.
16. GitHub → **Actions → Deploy staging** → the newest run → the `verify` leg
    shows the smoke test's four PASS lines, and the `deploy` leg prints the URL.
    The nightly **Staging smoke** job now runs every morning at 07:05 NZDT.

## If something is stuck

| Symptom | Cause | Fix |
|---|---|---|
| `Permission denied (publickey)` on the deploy | the key's public half is not on the host | re-run the bootstrap (the deploy does it on its first SSH) — or paste the `.pub` into `~/.ssh/authorized_keys` for `deploy` |
| Site unreachable but the deploy is green | Oracle's second firewall (step 2A) | add the two ingress rules |
| `x509: certificate signed by unknown authority` from your PC | the local-CA staging certificate | expected on an IP-only host; add step 3's name |
| The deploy says "A5 is waiting for the OCI host" | the GitHub Variables tab (step 13) is empty | set `COURIER_DOMAIN` |

---

*The deploy's own logs are the source of truth: `Actions → Deploy staging → the
run's job log`. The whole procedure the workflow runs is `infra/deploy.sh apply
--from infra/staging.env` + `infra/smoke.sh`, and both scripts run on the host
by hand exactly as CI runs them.*
