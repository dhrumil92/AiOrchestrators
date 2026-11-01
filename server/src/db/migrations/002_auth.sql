CREATE TABLE users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role          TEXT NOT NULL CHECK (role IN ('household', 'vendor')),
  name          TEXT NOT NULL,
  email         TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  vendor_id     UUID UNIQUE REFERENCES vendors (id) ON DELETE CASCADE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK ((role = 'vendor') = (vendor_id IS NOT NULL))
);

-- Only a hash of each session token is stored, so a database leak does not expose live sessions.
CREATE TABLE sessions (
  token_hash TEXT PRIMARY KEY,
  user_id    UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX sessions_user_idx ON sessions (user_id);

-- Null for requests made before accounts existed. Nobody can open those as an owner.
ALTER TABLE service_requests ADD COLUMN user_id UUID REFERENCES users (id) ON DELETE CASCADE;
CREATE INDEX service_requests_user_idx ON service_requests (user_id);
