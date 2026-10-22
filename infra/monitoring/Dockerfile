# The image of the heartbeat: the uptime monitor of the production stack.
#
# It is a small Alpine image with the tools the checks need: curl for the
# health endpoints and the webhook, coreutils for the date arithmetic, openssl
# for the certificate and the busybox tools for the rest.

FROM alpine:3.22

LABEL org.opencontainers.image.title="Courier Copilot heartbeat" \
	org.opencontainers.image.source="https://github.com/haytham26/courier" \
	org.opencontainers.image.licenses="UNLICENSED"

RUN apk add --no-cache bash curl coreutils openssl

COPY heartbeat.sh /usr/local/bin/heartbeat.sh
RUN chmod +x /usr/local/bin/heartbeat.sh

ENTRYPOINT ["/usr/local/bin/heartbeat.sh"]
