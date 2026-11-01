CREATE TABLE vendors (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name              TEXT NOT NULL,
  phone             TEXT,
  city              TEXT NOT NULL,
  latitude          DOUBLE PRECISION NOT NULL CHECK (latitude BETWEEN -90 AND 90),
  longitude         DOUBLE PRECISION NOT NULL CHECK (longitude BETWEEN -180 AND 180),
  service_radius_km INTEGER NOT NULL DEFAULT 50 CHECK (service_radius_km > 0),
  is_sample         BOOLEAN NOT NULL DEFAULT FALSE,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE service_requests (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_name     TEXT NOT NULL,
  phone              TEXT,
  latitude           DOUBLE PRECISION NOT NULL CHECK (latitude BETWEEN -90 AND 90),
  longitude          DOUBLE PRECISION NOT NULL CHECK (longitude BETWEEN -180 AND 180),
  address_text       TEXT,
  state_code         TEXT NOT NULL DEFAULT 'GJ',
  tariff_code        TEXT NOT NULL DEFAULT 'RGP',
  monthly_units      INTEGER NOT NULL CHECK (monthly_units > 0),
  budget_rupees      INTEGER NOT NULL CHECK (budget_rupees > 0),
  usable_area_sqm    NUMERIC(8, 2) CHECK (usable_area_sqm >= 0),
  preferred_language TEXT NOT NULL DEFAULT 'en' CHECK (preferred_language IN ('en', 'hi', 'gu')),
  status             TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed')),
  accepted_quote_id  UUID,
  is_sample          BOOLEAN NOT NULL DEFAULT FALSE,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX service_requests_status_idx ON service_requests (status);
CREATE INDEX service_requests_location_idx ON service_requests (latitude, longitude);

CREATE TABLE terrace_photos (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id   UUID NOT NULL REFERENCES service_requests (id) ON DELETE CASCADE,
  storage_key  TEXT NOT NULL,
  content_type TEXT NOT NULL,
  size_bytes   INTEGER NOT NULL CHECK (size_bytes >= 0),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX terrace_photos_request_idx ON terrace_photos (request_id);

CREATE TABLE photo_assessments (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id   UUID NOT NULL REFERENCES service_requests (id) ON DELETE CASCADE,
  photo_id     UUID NOT NULL REFERENCES terrace_photos (id) ON DELETE CASCADE,
  obstructions JSONB NOT NULL DEFAULT '[]',
  summary      TEXT NOT NULL,
  confidence   TEXT NOT NULL CHECK (confidence IN ('low', 'medium', 'high')),
  source       TEXT NOT NULL CHECK (source IN ('live', 'saved', 'template')),
  model_name   TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX photo_assessments_request_idx ON photo_assessments (request_id, created_at DESC);

CREATE TABLE quotes (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id              UUID NOT NULL REFERENCES service_requests (id) ON DELETE CASCADE,
  vendor_id               UUID NOT NULL REFERENCES vendors (id),
  system_kw               NUMERIC(5, 2) NOT NULL CHECK (system_kw > 0),
  price_rupees            INTEGER CHECK (price_rupees > 0),
  panel_brand             TEXT,
  panel_watts             INTEGER CHECK (panel_watts > 0),
  dcr_confirmed           BOOLEAN,
  inverter_brand          TEXT,
  inverter_kw             NUMERIC(5, 2) CHECK (inverter_kw > 0),
  inverter_warranty_years INTEGER CHECK (inverter_warranty_years >= 0),
  panel_warranty_years    INTEGER CHECK (panel_warranty_years >= 0),
  install_days            INTEGER CHECK (install_days > 0),
  notes_raw               TEXT,
  notes_clean             TEXT,
  status                  TEXT NOT NULL DEFAULT 'submitted'
                          CHECK (status IN ('submitted', 'accepted', 'not_selected')),
  injection_flagged       BOOLEAN NOT NULL DEFAULT FALSE,
  injection_reason        TEXT,
  is_sample               BOOLEAN NOT NULL DEFAULT FALSE,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (request_id, vendor_id)
);
CREATE UNIQUE INDEX quotes_one_accepted_per_request ON quotes (request_id) WHERE status = 'accepted';
CREATE INDEX quotes_vendor_idx ON quotes (vendor_id);

ALTER TABLE service_requests
  ADD CONSTRAINT service_requests_accepted_quote_fk
  FOREIGN KEY (accepted_quote_id) REFERENCES quotes (id) ON DELETE SET NULL;

CREATE TABLE recommendations (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id           UUID NOT NULL REFERENCES service_requests (id) ON DELETE CASCADE,
  recommended_quote_id UUID REFERENCES quotes (id) ON DELETE SET NULL,
  scores               JSONB NOT NULL DEFAULT '{}',
  explanation          JSONB NOT NULL DEFAULT '[]',
  language             TEXT NOT NULL CHECK (language IN ('en', 'hi', 'gu')),
  source               TEXT NOT NULL CHECK (source IN ('live', 'saved', 'template')),
  input_hash           TEXT NOT NULL,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (request_id, input_hash)
);

-- Stretch: small AI job queue.
CREATE TABLE ai_jobs (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type       TEXT NOT NULL,
  payload    JSONB NOT NULL DEFAULT '{}',
  status     TEXT NOT NULL DEFAULT 'queued'
             CHECK (status IN ('queued', 'running', 'done', 'failed')),
  attempts   INTEGER NOT NULL DEFAULT 0,
  run_after  TIMESTAMPTZ NOT NULL DEFAULT now(),
  error      TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ai_jobs_ready_idx ON ai_jobs (run_after) WHERE status = 'queued';
