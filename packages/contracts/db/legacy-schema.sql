-- Courier Copilot: PostgreSQL 16 + PostGIS 3 + pgvector
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE TABLE drivers (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name          text NOT NULL,
  phone         text UNIQUE,
  voice_prefs   jsonb NOT NULL DEFAULT '{"verbosity":"terse","units":"metric"}',
  created_at    timestamptz NOT NULL DEFAULT now()
);

-- A fixed territory run (e.g. "Northwood / Redwood AM").
CREATE TABLE runs (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id     uuid NOT NULL REFERENCES drivers(id) ON DELETE CASCADE,
  name          text NOT NULL,
  territory     geography(MultiPolygon, 4326) NOT NULL,
  depot         geography(Point, 4326) NOT NULL
);
CREATE INDEX runs_territory_gix ON runs USING gist (territory);

-- Master Template Lock: the driver's preferred street order.
CREATE TABLE run_template_segments (
  run_id        uuid NOT NULL REFERENCES runs(id) ON DELETE CASCADE,
  seq           int  NOT NULL,
  street_key    text NOT NULL,             -- normalised "redwood:main north rd"
  direction     text CHECK (direction IN ('odd_first','even_first','zigzag','asc','desc')),
  PRIMARY KEY (run_id, seq)
);
CREATE UNIQUE INDEX run_template_street_uq ON run_template_segments (run_id, street_key);

-- Canonical address/location, shared across days. Learns over time.
CREATE TABLE locations (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  address_key     text UNIQUE NOT NULL,    -- normalised full address
  street_key      text NOT NULL,
  house_number    text,
  unit            text,
  suburb          text,
  geocode_point   geography(Point, 4326),  -- what the geocoder says (curb)
  entry_point     geography(Point, 4326),  -- learned true drop point
  park_point      geography(Point, 4326),  -- learned van stopping point
  delivery_count  int NOT NULL DEFAULT 0
);
CREATE INDEX locations_entry_gix ON locations USING gist (entry_point);
CREATE INDEX locations_address_trgm ON locations USING gin (address_key gin_trgm_ops);

-- Free-text micro-entry lore ("side gate left of garage, dog"), embedded for retrieval.
CREATE TABLE location_notes (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id   uuid NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
  kind          text NOT NULL CHECK (kind IN ('entry','gate_code','hazard','safe_place','access')),
  body          text NOT NULL,
  embedding     vector(1024),
  confidence    real NOT NULL DEFAULT 0.5,
  last_confirmed timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX location_notes_vec ON location_notes USING hnsw (embedding vector_cosine_ops);

-- A single working day on a run.
CREATE TABLE shifts (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id        uuid NOT NULL REFERENCES runs(id),
  shift_date    date NOT NULL,
  status        text NOT NULL DEFAULT 'intake'
                CHECK (status IN ('intake','loading','active','break','done')),
  cursor_seq    int  NOT NULL DEFAULT 0,
  UNIQUE (run_id, shift_date)
);

CREATE TABLE parcels (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shift_id        uuid NOT NULL REFERENCES shifts(id) ON DELETE CASCADE,
  location_id     uuid REFERENCES locations(id),
  raw_input       text NOT NULL,                 -- verbatim transcript / OCR line
  source          text NOT NULL CHECK (source IN ('voice','ocr','scan','manual')),
  barcode         text,
  size_class      text CHECK (size_class IN ('satchel','small','medium','large','heavy')),
  van_zone        text CHECK (van_zone IN ('FL','FR','MID_RACK','REAR','HEAVY_BASE')),
  anomaly         text,                          -- out_of_territory | incomplete | duplicate | low_confidence
  anomaly_resolved boolean NOT NULL DEFAULT false
);

CREATE TABLE stops (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shift_id      uuid NOT NULL REFERENCES shifts(id) ON DELETE CASCADE,
  location_id   uuid NOT NULL REFERENCES locations(id),
  seq           int  NOT NULL,
  status        text NOT NULL DEFAULT 'pending'
                CHECK (status IN ('pending','delivered','skipped','deferred','failed')),
  priority      boolean NOT NULL DEFAULT false,
  UNIQUE (shift_id, seq) DEFERRABLE INITIALLY DEFERRED
);
CREATE TABLE stop_parcels (stop_id uuid REFERENCES stops(id) ON DELETE CASCADE,
                           parcel_id uuid REFERENCES parcels(id) ON DELETE CASCADE,
                           PRIMARY KEY (stop_id, parcel_id));

-- Append-only proof-of-delivery & voice events (also the offline-sync log).
CREATE TABLE delivery_events (
  id            uuid PRIMARY KEY,                -- client-generated for idempotent offline sync
  stop_id       uuid NOT NULL REFERENCES stops(id),
  kind          text NOT NULL,                   -- delivered | left_at | skipped | failed
  utterance     text,
  safe_place    text,
  position      geography(Point, 4326),          -- GPS at the moment of "Delivered"
  accuracy_m    real,
  occurred_at   timestamptz NOT NULL,
  received_at   timestamptz NOT NULL DEFAULT now()
);

-- Learning: shift a location's entry point toward the observed drop (EWMA), only for good fixes.
CREATE OR REPLACE FUNCTION learn_entry_point() RETURNS trigger AS $$
DECLARE loc uuid; alpha float := 0.3;
BEGIN
  IF NEW.kind NOT IN ('delivered','left_at') OR NEW.position IS NULL OR coalesce(NEW.accuracy_m, 99) > 15 THEN
    RETURN NEW;
  END IF;
  SELECT location_id INTO loc FROM stops WHERE id = NEW.stop_id;
  UPDATE locations SET
    entry_point = CASE WHEN entry_point IS NULL THEN NEW.position ELSE
      ST_SetSRID(ST_MakePoint(
        (1-alpha)*ST_X(entry_point::geometry) + alpha*ST_X(NEW.position::geometry),
        (1-alpha)*ST_Y(entry_point::geometry) + alpha*ST_Y(NEW.position::geometry)), 4326)::geography END,
    delivery_count = delivery_count + 1
  WHERE id = loc;
  RETURN NEW;
END $$ LANGUAGE plpgsql;
CREATE TRIGGER delivery_events_learn AFTER INSERT ON delivery_events
  FOR EACH ROW EXECUTE FUNCTION learn_entry_point();
