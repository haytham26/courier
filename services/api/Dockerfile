# The API's production image (A5: the staging deploy).
#
# Build it from infra/, where the compose files live:
#
#   docker build -t courier-api:local -f services/api/Dockerfile services/api
#
# What it does: a slim Python interpreter, the dependencies locked by uv (the
# same lock `uv sync --locked` uses in CI, so a deployment runs the code CI
# tested), and uvicorn on port 8000. No build tools are left in the final
# layer, and no test or type-checking package is installed: the image carries
# what runs the service, nothing else.
#
# The configuration is the environment (infra/env.example lists every variable
# the compose file sets), so the same image serves staging and production.
#
# The versions: PYTHON_VERSION must stay inside requires-python (>=3.11,<3.13).
# PYVRP 0.14.1 supplies prebuilt wheels for cp312 on linux/arm64 and amd64, so
# the same image builds on the OCI host and on a developer's arm64 Apple
# Silicon machine.

ARG PYTHON_VERSION=3.12

# --- the dependencies, on their own layer so a code change does not re-download ---
FROM python:${PYTHON_VERSION}-slim-bookworm AS deps

# uv is the package manager the repo pins; the version is the one CI installs.
COPY --from=ghcr.io/astral-sh/uv:0.9.7 /uv /usr/local/bin/uv

WORKDIR /app
# The dependency declarations first: this layer is only invalidated when they
# change, so a rebuild after a code change reuses it.
COPY pyproject.toml ./
COPY README.md ./
# The lock, when it is committed, makes the build deterministic.
COPY uv.lock* ./
ENV UV_PROJECT_ENVIRONMENT=/opt/venv \
    UV_COMPILE_BYTECODE=1 \
    UV_LINK_MODE=copy \
    UV_NO_CACHE=1
# --frozen: the lock decides, never a floating index. Without a lock the
# resolver runs, which is the same behaviour CI's `uv sync` has.
RUN --mount=type=cache,target=/root/.cache/uv \
    if [ -f uv.lock ]; then \
        echo "building from the committed lock"; \
        uv sync --frozen --no-dev --no-install-project; \
    else \
        echo "no committed lock: resolving the dependencies"; \
        uv sync --no-dev --no-install-project; \
    fi

# --- the application ---
FROM python:${PYTHON_VERSION}-slim-bookworm AS runtime

# curl is what the healthcheck uses; libpq is what psycopg links against.
RUN apt-get update \
    && apt-get install -y --no-install-recommends curl libpq5 \
    && rm -rf /var/lib/apt/lists/*

COPY --from=deps /opt/venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH" \
    PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    VIRTUAL_ENV=/opt/venv

# The service does not need root, and a container that runs as root is a
# container an escaped process lands in with root (ASVS V14, and Semgrep's
# dockerfile.security.missing-user). The venv is world-readable so the user can
# run it without owning it; the working directory is the user's own, because the
# POD store writes into it (POD_STORAGE_BACKEND=local).
RUN useradd --create-home --uid 10001 app \
    && chmod -R a+rX /opt/venv
USER app

WORKDIR /app
# The application code. The tests, the ops tools and the load tests are not
# copied: a production image carries what serves requests.
#
# The contracts package is not needed at runtime (the API reads the contract in
# its tests, and the schema is applied by the migrations), so it is not copied
# here. The build context is services/api, which keeps this layer small and
# means a change to another package does not invalidate it.
COPY app ./app

# The compose file's healthcheck calls /healthz inside the container (the
# API's contract carries /healthz; the Caddyfile answers 404 for /health* in
# front of it, deliberately).
EXPOSE 8000

# One process, one worker per replica: the replicas are the scaling unit, and
# the zero-downtime swap replaces them one at a time.
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "1"]
