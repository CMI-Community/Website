-- Better Auth's adapter adds a generated id to rate-limit rows even though the
-- logical schema is keyed by `key`. Recreate the empty foundation table with
-- the physical id column expected by the adapter.
DROP TABLE auth_rate_limits;

CREATE TABLE auth_rate_limits (
  id TEXT PRIMARY KEY NOT NULL,
  key TEXT NOT NULL UNIQUE,
  count INTEGER NOT NULL,
  lastRequest INTEGER NOT NULL
);
