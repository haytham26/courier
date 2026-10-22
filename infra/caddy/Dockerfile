# The edge image of Courier Copilot: the official Caddy with the rate limit
# module added.
#
# Caddy 2.10.2 is the newest release the caddy-ratelimit module builds
# against: the module asks for Caddy 2.10 (see its go.mod), so a newer Caddy
# would not compile with it. The version is pinned here on purpose: the
# upgrade to Caddy 2.11 waits for the module to support it.
#
# Build:
#   docker build -t courier-caddy:2.10.2 infra/caddy

FROM caddy:2.10.2-builder-alpine AS builder

RUN xcaddy build v2.10.2 \
	--with github.com/mholt/caddy-ratelimit \
	--output /usr/bin/caddy

FROM caddy:2.10.2-alpine

LABEL org.opencontainers.image.title="Courier Copilot edge" \
	org.opencontainers.image.source="https://github.com/haytham26/courier" \
	org.opencontainers.image.licenses="UNLICENSED"

COPY --from=builder /usr/bin/caddy /usr/bin/caddy

# The configuration comes from the compose file; the certificate and the
# account live on the caddy_data volume.
