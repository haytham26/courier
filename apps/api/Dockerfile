# The image of the Courier Copilot API.
#
# The API is a standalone uv project (apps/api/uv.lock), so the build context
# is apps/api and the image never carries the workspace.
#
# Build:
#   docker build -f apps/api/Dockerfile -t courier-api:local apps/api

# The uv binary: the lockfile alone decides what is installed.
FROM ghcr.io/astral-sh/uv:0.13.1 AS uv

# The builder: the environment is created once, from the lockfile.
FROM python:3.12-slim-trixie AS builder

LABEL org.opencontainers.image.title="Courier Copilot API" \
	org.opencontainers.image.source="https://github.com/haytham26/courier" \
	org.opencontainers.image.licenses="UNLICENSED"

COPY --from=uv /uv /uvx /bin/

ENV PYTHONDONTWRITEBYTECODE=1 \
	PYTHONUNBUFFERED=1 \
	UV_COMPILE_BYTECODE=1 \
	UV_LINK_MODE=copy \
	UV_PYTHON_DOWNLOADS=never

WORKDIR /app

# The dependencies first: this layer is reused until the lockfile changes.
COPY pyproject.toml uv.lock README.md ./
RUN uv sync --frozen --no-dev --no-install-project

COPY app ./app
RUN uv sync --frozen --no-dev

# The runtime: the environment and the code, nothing else. The package
# manager is not here: the service never installs anything at start-up.
FROM python:3.12-slim-trixie AS runtime

LABEL org.opencontainers.image.title="Courier Copilot API" \
	org.opencontainers.image.source="https://github.com/haytham26/courier" \
	org.opencontainers.image.licenses="UNLICENSED"

ENV PYTHONDONTWRITEBYTECODE=1 \
	PYTHONUNBUFFERED=1

WORKDIR /app

COPY --from=builder /app /app

# The service runs as an unprivileged user.
RUN useradd --system --uid 10001 --no-create-home courier \
	&& chown -R courier:courier /app
USER courier

EXPOSE 8000

# The proxy headers are only trusted from the edge (172.28.0.40), which
# overwrites them with the real address of the caller.
CMD ["/app/.venv/bin/uvicorn", "app.main:app", \
	"--host", "0.0.0.0", "--port", "8000", \
	"--proxy-headers", "--forwarded-allow-ips=172.28.0.40"]
