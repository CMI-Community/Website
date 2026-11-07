CREATE TABLE event_admin_otp_sessions (
  session_id TEXT PRIMARY KEY REFERENCES auth_sessions(id) ON DELETE CASCADE,
  verified_at TEXT NOT NULL
);

CREATE TABLE event_otp_send_limits (
  rate_key TEXT PRIMARY KEY,
  sent_at INTEGER NOT NULL
);

CREATE TABLE integration_api_keys (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  token_hash TEXT NOT NULL UNIQUE,
  token_prefix TEXT NOT NULL,
  source TEXT NOT NULL,
  permissions_json TEXT NOT NULL CHECK (json_valid(permissions_json)),
  scope_json TEXT NOT NULL CHECK (json_valid(scope_json)),
  epoch TEXT NOT NULL,
  created_by TEXT NOT NULL REFERENCES auth_users(id),
  created_at TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  revoked_at TEXT
);
CREATE INDEX integration_keys_source_idx ON integration_api_keys(source, expires_at);
