PRAGMA foreign_keys = ON;
CREATE TABLE community_series (
 id TEXT PRIMARY KEY, slug TEXT NOT NULL UNIQUE, name TEXT NOT NULL,
 description TEXT NOT NULL DEFAULT '', logo_media_id TEXT REFERENCES event_media(media_id),
 status TEXT NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','published','unpublished')),
 sort_order INTEGER NOT NULL DEFAULT 0, version INTEGER NOT NULL DEFAULT 1 CHECK(version>0),
 created_at TEXT NOT NULL, updated_at TEXT NOT NULL
);
CREATE INDEX community_series_public_idx ON community_series(status,sort_order);
CREATE TABLE community_photos (
 id TEXT PRIMARY KEY, alt TEXT NOT NULL, media_id TEXT UNIQUE REFERENCES event_media(media_id),
 legacy_full_path TEXT UNIQUE, legacy_thumbnail_path TEXT,
 width INTEGER NOT NULL CHECK(width>0), height INTEGER NOT NULL CHECK(height>0),
 status TEXT NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','published','unpublished')),
 series_id TEXT REFERENCES community_series(id), event_id TEXT REFERENCES event_details(content_id),
 sort_order INTEGER NOT NULL DEFAULT 0, version INTEGER NOT NULL DEFAULT 1 CHECK(version>0),
 created_at TEXT NOT NULL, updated_at TEXT NOT NULL,
 CHECK((media_id IS NOT NULL AND legacy_full_path IS NULL AND legacy_thumbnail_path IS NULL) OR
       (media_id IS NULL AND legacy_full_path IS NOT NULL AND legacy_thumbnail_path IS NOT NULL))
);
CREATE INDEX community_photos_public_idx ON community_photos(status,sort_order);
CREATE INDEX community_photos_series_idx ON community_photos(series_id,status);
CREATE INDEX community_photos_event_idx ON community_photos(event_id,status);
CREATE TABLE activity_series_memberships (
 event_id TEXT PRIMARY KEY REFERENCES event_details(content_id),
 series_id TEXT REFERENCES community_series(id), version INTEGER NOT NULL DEFAULT 1 CHECK(version>0),
 updated_at TEXT NOT NULL
);
CREATE INDEX activity_series_memberships_series_idx ON activity_series_memberships(series_id);
CREATE TABLE community_imports (id TEXT PRIMARY KEY, item_count INTEGER NOT NULL, imported_at TEXT NOT NULL);
CREATE TABLE community_write_assertions (id TEXT PRIMARY KEY, passed INTEGER NOT NULL CHECK(passed=1));
CREATE TABLE legacy_event_overrides (
 id TEXT PRIMARY KEY, title TEXT NOT NULL, summary TEXT NOT NULL, category TEXT NOT NULL,
 initiator TEXT NOT NULL, series_id TEXT REFERENCES community_series(id),
 status TEXT NOT NULL DEFAULT 'published' CHECK(status IN ('draft','published','unpublished')),
 version INTEGER NOT NULL DEFAULT 1 CHECK(version>0), updated_at TEXT NOT NULL
);
CREATE INDEX legacy_event_overrides_series_idx ON legacy_event_overrides(series_id,status);
