PRAGMA foreign_keys = ON;

CREATE TABLE blog_authors (
  id TEXT PRIMARY KEY,
  display_name TEXT NOT NULL,
  active INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0,1)),
  version INTEGER NOT NULL DEFAULT 1 CHECK (version > 0),
  updated_at TEXT NOT NULL
);

CREATE TABLE blog_posts (
  id TEXT PRIMARY KEY,
  slug TEXT UNIQUE NOT NULL,
  draft_json TEXT NOT NULL,
  draft_source_url TEXT UNIQUE,
  version INTEGER NOT NULL DEFAULT 1 CHECK (version > 0),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  published_revision_id TEXT,
  FOREIGN KEY (id, published_revision_id) REFERENCES blog_revisions(post_id, id)
);

CREATE TABLE blog_revisions (
  id TEXT PRIMARY KEY,
  post_id TEXT NOT NULL REFERENCES blog_posts(id),
  title TEXT NOT NULL,
  summary TEXT NOT NULL,
  locale TEXT NOT NULL CHECK (locale IN ('zh-CN','en')),
  display_date TEXT NOT NULL,
  author_id TEXT NOT NULL REFERENCES blog_authors(id),
  source_url TEXT,
  body_json TEXT NOT NULL,
  published_at TEXT NOT NULL,
  UNIQUE (post_id, id)
);
CREATE INDEX blog_revision_listing ON blog_revisions(display_date DESC, published_at DESC, id);
CREATE INDEX blog_revision_source ON blog_revisions(source_url) WHERE source_url IS NOT NULL;

CREATE TABLE blog_revision_series (
  revision_id TEXT NOT NULL REFERENCES blog_revisions(id),
  series_id TEXT NOT NULL REFERENCES community_series(id),
  PRIMARY KEY (revision_id, series_id)
);
CREATE INDEX blog_series_lookup ON blog_revision_series(series_id, revision_id);

CREATE TABLE blog_revision_events (
  revision_id TEXT NOT NULL REFERENCES blog_revisions(id),
  kind TEXT NOT NULL CHECK (kind IN ('managed','archive')),
  event_id TEXT NOT NULL,
  PRIMARY KEY (revision_id, kind, event_id)
);
CREATE INDEX blog_event_lookup ON blog_revision_events(kind, event_id, revision_id);

CREATE TABLE blog_revision_photos (
  revision_id TEXT NOT NULL REFERENCES blog_revisions(id),
  photo_id TEXT NOT NULL REFERENCES community_photos(id),
  position INTEGER NOT NULL CHECK (position >= 0),
  PRIMARY KEY (revision_id, photo_id)
);

CREATE TABLE blog_images (
  id TEXT PRIMARY KEY,
  object_key TEXT UNIQUE NOT NULL,
  mime_type TEXT NOT NULL CHECK (mime_type IN ('image/jpeg','image/png','image/webp','image/gif')),
  width INTEGER NOT NULL CHECK (width > 0),
  height INTEGER NOT NULL CHECK (height > 0),
  created_at TEXT NOT NULL
);

CREATE TABLE blog_revision_images (
  revision_id TEXT NOT NULL REFERENCES blog_revisions(id),
  image_id TEXT NOT NULL REFERENCES blog_images(id),
  PRIMARY KEY (revision_id, image_id)
);

CREATE TABLE blog_translation_chunks (
  revision_id TEXT NOT NULL REFERENCES blog_revisions(id),
  locale TEXT NOT NULL CHECK (locale IN ('zh-CN','en')),
  position INTEGER NOT NULL CHECK (position >= 0),
  claim TEXT NOT NULL,
  lease_until INTEGER NOT NULL,
  result_json TEXT,
  PRIMARY KEY (revision_id, locale, position)
);

CREATE TABLE blog_translation_daily (
  day TEXT PRIMARY KEY,
  calls INTEGER NOT NULL DEFAULT 0 CHECK (calls >= 0)
);
