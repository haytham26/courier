-- The schema of the Courier Copilot database (PostgreSQL 16 + PostGIS).
--
-- The phone owns the event log while the courier is offline; the API stores
-- what arrives. The event id comes from the phone, so a replayed batch is
-- stored once.

CREATE TABLE IF NOT EXISTS shifts (
    id          uuid PRIMARY KEY,
    courier_id  text        NOT NULL,
    started_at  timestamptz NOT NULL,
    ended_at    timestamptz
);

CREATE TABLE IF NOT EXISTS stops (
    id          uuid PRIMARY KEY,
    shift_id    uuid        NOT NULL REFERENCES shifts (id) ON DELETE CASCADE,
    sequence    integer     NOT NULL,
    address     text        NOT NULL,
    suburb      text,
    latitude    double precision,
    longitude   double precision,
    status      text        NOT NULL DEFAULT 'pending',
    safe_place  text,
    door_note   text
);

CREATE INDEX IF NOT EXISTS stops_shift_sequence ON stops (shift_id, sequence);

CREATE TABLE IF NOT EXISTS delivery_events (
    id          uuid PRIMARY KEY,
    shift_id    uuid        NOT NULL REFERENCES shifts (id) ON DELETE CASCADE,
    stop_id     uuid        NOT NULL,
    kind        text        NOT NULL,
    utterance   text,
    safe_place  text,
    lat         double precision,
    lon         double precision,
    accuracy_m  double precision,
    occurred_at timestamptz NOT NULL,
    received_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS delivery_events_shift ON delivery_events (shift_id, occurred_at);

-- The address of every stop, corrected and normalised, with the door memory
-- the courier taught us.
CREATE TABLE IF NOT EXISTS stop_addresses (
    id          uuid PRIMARY KEY,
    stop_id     uuid        NOT NULL REFERENCES stops (id) ON DELETE CASCADE,
    original    text        NOT NULL,
    corrected   text        NOT NULL,
    reason      text        NOT NULL,
    confidence  real        NOT NULL,
    needs_question boolean NOT NULL DEFAULT false,
    created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS door_memory (
    id          uuid PRIMARY KEY,
    courier_id  text        NOT NULL,
    address_key text        NOT NULL,
    note        text,
    safe_place  text,
    updated_at  timestamptz NOT NULL DEFAULT now(),
    UNIQUE (courier_id, address_key)
);

-- The geography: the point of every stop, so the route can be built with
-- PostGIS.
CREATE EXTENSION IF NOT EXISTS postgis;

ALTER TABLE stops
    ADD COLUMN IF NOT EXISTS entry_point geometry(Point, 4326);
