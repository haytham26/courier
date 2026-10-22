# The database of Courier Copilot: PostgreSQL 16 with PostGIS and pgvector.
#
# The PostGIS image carries PostGIS but not pgvector, and the schema
# (db/schema.sql) needs both: the locations are geographies and the location
# notes hold an embedding.
#
# The image is the PostGIS 3.6 one because it is built on the trixie base of
# the official PostgreSQL image, and the PostgreSQL repository still serves
# the pgvector package for it. The development compose file still runs
# PostGIS 3.5; the schema is the same on both.
#
# Build:
#   docker build -t courier-postgres:16-3.6-pgvector infra/postgres

FROM postgis/postgis:16-3.6

LABEL org.opencontainers.image.title="Courier Copilot database" \
	org.opencontainers.image.source="https://github.com/haytham26/courier" \
	org.opencontainers.image.licenses="UNLICENSED"

# The package comes from the PostgreSQL repository the base image already
# trusts; the version is the one that repository serves.
RUN apt-get update \
	&& apt-get install -y --no-install-recommends postgresql-16-pgvector \
	&& rm -rf /var/lib/apt/lists/*
