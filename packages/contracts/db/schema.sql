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
    location_id uuid        NOT NULL,
    latitude    double precision,
    longitude   double precision,
    status      text        NOT NULL DEFAULT 'pending',
    safe_place  text,
    door_note   text,
    priority    boolean     NOT NULL DEFAULT false,
    parcels     integer     NOT NULL DEFAULT 1,
    service_time_s integer,
    time_window_start timestamptz,
    time_window_end   timestamptz
);

CREATE INDEX IF NOT EXISTS stops_shift_sequence ON stops (shift_id, sequence);
CREATE INDEX IF NOT EXISTS stops_location ON stops (location_id);

-- The run: one courier's day, one van, one shift. The constraints the
-- routing engine needs (the depot, the capacity, the speed) live here.
CREATE TABLE IF NOT EXISTS runs (
    id               uuid PRIMARY KEY,
    shift_id         uuid        NOT NULL UNIQUE REFERENCES shifts (id) ON DELETE CASCADE,
    courier_id       text        NOT NULL,
    name             text        NOT NULL DEFAULT '',
    depot_lat        double precision NOT NULL,
    depot_lon        double precision NOT NULL,
    capacity_parcels integer,
    speed_kmh        double precision NOT NULL DEFAULT 30,
    start_at         timestamptz NOT NULL,
    created_at       timestamptz NOT NULL DEFAULT now(),
    updated_at       timestamptz NOT NULL DEFAULT now()
);

-- The Master Template Lock: the courier's own street order. The identity
-- comes from the phone, so the same template is stored once when it is
-- replayed offline, and the same saved template can be applied to another
-- run.
CREATE TABLE IF NOT EXISTS run_templates (
    run_id     uuid PRIMARY KEY REFERENCES runs (id) ON DELETE CASCADE,
    template_id text NOT NULL,
    segments   jsonb NOT NULL,
    stop_order jsonb NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

-- The planned day: the ordered stops with the arrival times.
CREATE TABLE IF NOT EXISTS run_routes (
    run_id            uuid PRIMARY KEY REFERENCES runs (id) ON DELETE CASCADE,
    engine            text NOT NULL,
    total_distance_m  double precision NOT NULL,
    total_duration_s  double precision NOT NULL,
    parcels           integer NOT NULL,
    capacity_parcels  integer,
    over_capacity     boolean NOT NULL DEFAULT false,
    window_violations integer NOT NULL DEFAULT 0,
    created_at        timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS run_route_stops (
    run_id                 uuid NOT NULL REFERENCES runs (id) ON DELETE CASCADE,
    position               integer NOT NULL,
    stop_id                uuid NOT NULL,
    lat                    double precision NOT NULL,
    lon                    double precision NOT NULL,
    arrival_at             timestamptz NOT NULL,
    departure_at           timestamptz NOT NULL,
    distance_m             double precision NOT NULL,
    cumulative_distance_m double precision NOT NULL,
    late                   boolean NOT NULL DEFAULT false,
    PRIMARY KEY (run_id, position)
);

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

-- The door memory (ADR-012): one note per (courier, location, kind). The
-- location id is derived from the canonical address until the LINZ ids
-- land; address_key keeps the text for audit and the migration.
CREATE TABLE IF NOT EXISTS door_memory (
    id             uuid PRIMARY KEY,
    courier_id     text        NOT NULL,
    location_id    uuid        NOT NULL,
    address_key    text        NOT NULL,
    kind           text        NOT NULL,
    body           text        NOT NULL,
    confidence     real        NOT NULL DEFAULT 0.5,
    last_confirmed timestamptz NOT NULL DEFAULT now(),
    UNIQUE (courier_id, location_id, kind)
);

-- The geography: the point of every stop, so the route can be built with
-- PostGIS.
CREATE EXTENSION IF NOT EXISTS postgis;

ALTER TABLE stops
    ADD COLUMN IF NOT EXISTS entry_point geometry(Point, 4326);

-- The constraints the routing engine honours, on a database that was
-- created before them.
ALTER TABLE stops
    ADD COLUMN IF NOT EXISTS priority boolean NOT NULL DEFAULT false;
ALTER TABLE stops
    ADD COLUMN IF NOT EXISTS parcels integer NOT NULL DEFAULT 1;
ALTER TABLE stops
    ADD COLUMN IF NOT EXISTS service_time_s integer;
ALTER TABLE stops
    ADD COLUMN IF NOT EXISTS time_window_start timestamptz;
ALTER TABLE stops
    ADD COLUMN IF NOT EXISTS time_window_end timestamptz;
