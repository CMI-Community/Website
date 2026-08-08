PRAGMA foreign_keys = ON;

-- Better Auth core schema. Table names are explicit so application tables never
-- collide with SQLite keywords or future domain names.
CREATE TABLE auth_users (
  id TEXT PRIMARY KEY NOT NULL,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE COLLATE NOCASE,
  emailVerified INTEGER NOT NULL DEFAULT 0,
  image TEXT,
  createdAt INTEGER NOT NULL,
  updatedAt INTEGER NOT NULL
);

CREATE TABLE auth_sessions (
  id TEXT PRIMARY KEY NOT NULL,
  userId TEXT NOT NULL REFERENCES auth_users (id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  expiresAt INTEGER NOT NULL,
  ipAddress TEXT,
  userAgent TEXT,
  createdAt INTEGER NOT NULL,
  updatedAt INTEGER NOT NULL
);

CREATE INDEX auth_sessions_user_idx ON auth_sessions (userId);
CREATE INDEX auth_sessions_expires_idx ON auth_sessions (expiresAt);

CREATE TABLE auth_accounts (
  id TEXT PRIMARY KEY NOT NULL,
  userId TEXT NOT NULL REFERENCES auth_users (id) ON DELETE CASCADE,
  accountId TEXT NOT NULL,
  providerId TEXT NOT NULL,
  accessToken TEXT,
  refreshToken TEXT,
  idToken TEXT,
  accessTokenExpiresAt INTEGER,
  refreshTokenExpiresAt INTEGER,
  scope TEXT,
  password TEXT,
  createdAt INTEGER NOT NULL,
  updatedAt INTEGER NOT NULL,
  UNIQUE (providerId, accountId)
);

CREATE INDEX auth_accounts_user_idx ON auth_accounts (userId);

CREATE TABLE auth_verifications (
  id TEXT PRIMARY KEY NOT NULL,
  identifier TEXT NOT NULL,
  value TEXT NOT NULL,
  expiresAt INTEGER NOT NULL,
  createdAt INTEGER NOT NULL,
  updatedAt INTEGER NOT NULL
);

CREATE INDEX auth_verifications_identifier_idx ON auth_verifications (identifier);
CREATE INDEX auth_verifications_expires_idx ON auth_verifications (expiresAt);

CREATE TABLE auth_rate_limits (
  key TEXT PRIMARY KEY NOT NULL,
  count INTEGER NOT NULL,
  lastRequest INTEGER NOT NULL
);

CREATE TABLE profiles (
  user_id TEXT PRIMARY KEY REFERENCES auth_users (id) ON DELETE CASCADE,
  display_name TEXT NOT NULL,
  handle TEXT UNIQUE COLLATE NOCASE,
  bio TEXT,
  locale TEXT NOT NULL DEFAULT 'zh-CN' CHECK (locale IN ('zh-CN', 'en')),
  visibility TEXT NOT NULL DEFAULT 'members' CHECK (visibility IN ('private', 'members', 'public')),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE TABLE user_roles (
  user_id TEXT NOT NULL REFERENCES auth_users (id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('member', 'editor', 'moderator', 'admin')),
  granted_by TEXT REFERENCES auth_users (id) ON DELETE SET NULL,
  granted_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  PRIMARY KEY (user_id, role)
);

CREATE INDEX user_roles_role_idx ON user_roles (role, user_id);

CREATE TABLE invitations (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL COLLATE NOCASE,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('member', 'editor', 'moderator', 'admin')),
  invited_by TEXT REFERENCES auth_users (id) ON DELETE SET NULL,
  expires_at TEXT NOT NULL,
  accepted_at TEXT,
  accepted_by TEXT REFERENCES auth_users (id) ON DELETE SET NULL,
  revoked_at TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE UNIQUE INDEX invitations_active_email_idx
  ON invitations (lower(email))
  WHERE accepted_at IS NULL AND revoked_at IS NULL;

CREATE INDEX invitations_expires_idx ON invitations (expires_at);

CREATE TABLE content_entries (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL CHECK (type IN ('page', 'story', 'event', 'memory', 'experiment')),
  locale TEXT NOT NULL DEFAULT 'zh-CN' CHECK (locale IN ('zh-CN', 'en')),
  slug TEXT NOT NULL,
  title TEXT NOT NULL,
  summary TEXT,
  body_md TEXT NOT NULL DEFAULT '',
  metadata_json TEXT NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
  created_by TEXT NOT NULL REFERENCES auth_users (id),
  updated_by TEXT NOT NULL REFERENCES auth_users (id),
  published_by TEXT REFERENCES auth_users (id),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  published_at TEXT,
  UNIQUE (locale, slug)
);

CREATE INDEX content_public_idx ON content_entries (locale, status, published_at DESC);
CREATE INDEX content_updated_idx ON content_entries (updated_at DESC);

CREATE TABLE content_revisions (
  id TEXT PRIMARY KEY,
  content_id TEXT NOT NULL REFERENCES content_entries (id) ON DELETE CASCADE,
  revision_number INTEGER NOT NULL,
  snapshot_json TEXT NOT NULL,
  created_by TEXT NOT NULL REFERENCES auth_users (id),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  UNIQUE (content_id, revision_number)
);

CREATE INDEX content_revisions_content_idx
  ON content_revisions (content_id, revision_number DESC);

CREATE TABLE media_assets (
  id TEXT PRIMARY KEY,
  object_key TEXT NOT NULL UNIQUE,
  mime_type TEXT NOT NULL,
  byte_size INTEGER NOT NULL CHECK (byte_size >= 0),
  alt_text TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'ready', 'quarantined', 'deleted')),
  created_by TEXT NOT NULL REFERENCES auth_users (id),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE INDEX media_assets_status_idx ON media_assets (status, created_at DESC);

CREATE TABLE audit_logs (
  id TEXT PRIMARY KEY,
  actor_user_id TEXT REFERENCES auth_users (id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  resource_id TEXT,
  metadata_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE INDEX audit_logs_resource_idx ON audit_logs (resource_type, resource_id, created_at DESC);
CREATE INDEX audit_logs_actor_idx ON audit_logs (actor_user_id, created_at DESC);

-- The existing anonymous feedback behavior is preserved during migration.
CREATE TABLE cmi_feedback_ideas (
  id TEXT PRIMARY KEY,
  body TEXT NOT NULL,
  author_name TEXT,
  created_by TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'published',
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  CHECK (length(trim(body)) BETWEEN 1 AND 50),
  CHECK (author_name IS NULL OR length(trim(author_name)) BETWEEN 1 AND 20),
  CHECK (status IN ('published', 'hidden'))
);

CREATE TABLE cmi_feedback_votes (
  idea_id TEXT NOT NULL REFERENCES cmi_feedback_ideas (id) ON DELETE CASCADE,
  voter_id TEXT NOT NULL,
  value INTEGER NOT NULL CHECK (value IN (-1, 1)),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  PRIMARY KEY (idea_id, voter_id)
);

CREATE INDEX feedback_ideas_published_idx
  ON cmi_feedback_ideas (created_at DESC) WHERE status = 'published';
CREATE INDEX feedback_ideas_creator_idx ON cmi_feedback_ideas (created_by, created_at DESC);
CREATE INDEX feedback_votes_idea_idx ON cmi_feedback_votes (idea_id);
