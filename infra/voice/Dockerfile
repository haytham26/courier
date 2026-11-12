# The image of Courier Voice for the founder's local stack (the 2026-11-12
# directive item 1: "API + auth + Postgres/PostGIS + the voice service + the
# edge").
#
#   docker build -f infra/voice/Dockerfile -t courier-voice:local .
#
# The context is the REPOSITORY ROOT (one level above this file), because the
# service this builds lives in `services/courier-voice` and that tree is the
# lead's: this file only reads it. The lead's own README is the faithful way to
# run the service (`uv sync` + `uv run uvicorn`), and the lockfile it pins is
# uv's revision 5 - a uv newer than the one GHCR's `astral-sh/uv` image tags
# carry - so the image installs the project the ordinary way (pip, with the
# constraints file beside this one) rather than pretending a lock lookup that
# would not happen. The dependency set is `pyproject.toml`'s own: fastapi,
# uvicorn, pydantic, pydantic-settings, httpx and pyjwt, which is the whole of
# what `app.main` imports (the eval extras - numpy, soundfile, sherpa-onnx -
# belong to `app/eval_*.py` and are not in the service's import chain).
#
# ARM64: everything here is a manylinux wheel or a pure-Python package, so the
# same file builds on the founder's x86_64 PC and on the Oracle Ampere host.

FROM python:3.12-slim-bookworm

# The audit's security patch for a transitive dependency (PYSEC-2026-4320 in
# certifi), carried as the constraint the lockfile declares in its
# [tool.uv] section: a local stack is not a reason to ship the unpatched one.
COPY infra/voice/constraints.txt /tmp/constraints.txt

# The service itself, read-only from the lead's tree.
COPY services/courier-voice /src/courier-voice

RUN pip install --no-cache-dir --break-system-packages \
      -c /tmp/constraints.txt /src/courier-voice \
    && pip check \
    && find /src/courier-voice -name '__pycache__' -prune -exec rm -rf {} +

# The service does not need root, and a container that runs as root is a
# container an escaped process lands in with root (ASVS V14, and Semgrep's
# dockerfile.security.missing-user - which is why this step exists). The
# installed package is world-readable, so the user below can import it.
RUN groupadd --gid 10003 app \
    && useradd --uid 10003 --gid app --create-home app \
    && chmod -R a+rX /usr/local/lib/python3.12/site-packages
USER app

WORKDIR /src/courier-voice

# The port the app dials (services/courier-voice/README.md: `uvicorn app.main:app
# --port 8080`). One worker: the founder's day is one phone, and the turn
# machine's memory is in-process (the service's own README says so).
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1
EXPOSE 8080

HEALTHCHECK --interval=15s --timeout=5s --start-period=20s --retries=5 \
  CMD python -c "import urllib.request,sys; sys.exit(0 if urllib.request.urlopen('http://127.0.0.1:8080/healthz', timeout=3).status == 200 else 1)" || exit 1

CMD ["python", "-m", "uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8080"]
