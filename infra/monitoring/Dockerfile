# The image of the heartbeat: the uptime monitor of the production stack.
#
# It is a small Alpine image with the tools the checks need: curl for the
# health endpoints and the webhook, coreutils for the date arithmetic, openssl
# for the certificate and the busybox tools for the rest.
#
# The checks run as a dedicated non-root user (the container hardening the
# security review expects: no program in the stack runs as root without a
# written reason). The state folder is owned by that user; the mounted
# files (the access log, the certificates, the backups) have to be readable by
# them (uid 10001): the files the stack wrote with the default umask (0644
# files, 0755 folders) are.

FROM alpine:3.22

LABEL org.opencontainers.image.title="Courier Copilot heartbeat" \
	org.opencontainers.image.source="https://github.com/haytham26/courier" \
	org.opencontainers.image.licenses="UNLICENSED"

RUN apk add --no-cache bash curl coreutils openssl \
	&& addgroup -g 10001 -S heartbeat \
	&& adduser -u 10001 -S -G heartbeat -h /var/lib/courier-heartbeat heartbeat \
	&& mkdir -p /var/lib/courier-heartbeat \
	&& chown heartbeat:heartbeat /var/lib/courier-heartbeat

COPY --chown=heartbeat:heartbeat heartbeat.sh /usr/local/bin/heartbeat.sh
RUN chmod 0550 /usr/local/bin/heartbeat.sh

USER 10001

ENTRYPOINT ["/usr/local/bin/heartbeat.sh"]
