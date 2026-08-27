-- Migration number: 0003 	 2026-08-27T11:52:52.663Z

ALTER TABLE media_assets ADD COLUMN checksum_sha256 TEXT;
ALTER TABLE media_assets ADD COLUMN source_system TEXT;
ALTER TABLE media_assets ADD COLUMN rights_status TEXT NOT NULL DEFAULT 'unknown'
  CHECK (rights_status IN ('unknown', 'research_only', 'cleared'));

CREATE INDEX media_assets_checksum_idx
  ON media_assets (checksum_sha256)
  WHERE checksum_sha256 IS NOT NULL;

CREATE TABLE project_archive_imports (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  source_system TEXT NOT NULL,
  source_snapshot_at TEXT NOT NULL,
  record_count INTEGER NOT NULL CHECK (record_count >= 0),
  object_count INTEGER NOT NULL CHECK (object_count >= 0),
  total_bytes INTEGER NOT NULL CHECK (total_bytes >= 0),
  manifest_sha256 TEXT NOT NULL CHECK (length(manifest_sha256) = 64),
  status TEXT NOT NULL DEFAULT 'verified'
    CHECK (status IN ('pending', 'verified', 'failed')),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  UNIQUE (project_id, source_system, manifest_sha256)
);

CREATE INDEX project_archive_imports_project_idx
  ON project_archive_imports (project_id, created_at DESC);

CREATE TABLE project_archive_entries (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  source_system TEXT NOT NULL,
  source_id TEXT,
  source_import_id TEXT,
  archive_number TEXT NOT NULL,
  museum_id TEXT NOT NULL,
  source_title TEXT NOT NULL,
  source_location TEXT NOT NULL DEFAULT '',
  observation TEXT NOT NULL DEFAULT '',
  verified_information TEXT NOT NULL DEFAULT '',
  open_question TEXT NOT NULL DEFAULT '',
  carrier_tags_json TEXT NOT NULL DEFAULT '[]' CHECK (json_valid(carrier_tags_json)),
  position_tags_json TEXT NOT NULL DEFAULT '[]' CHECK (json_valid(position_tags_json)),
  structure_tags_json TEXT NOT NULL DEFAULT '[]' CHECK (json_valid(structure_tags_json)),
  material_tags_json TEXT NOT NULL DEFAULT '[]' CHECK (json_valid(material_tags_json)),
  collector_name TEXT NOT NULL DEFAULT '匿名采集者',
  status TEXT NOT NULL CHECK (status IN ('published', 'hidden', 'archived')),
  rights_status TEXT NOT NULL DEFAULT 'unknown'
    CHECK (rights_status IN ('unknown', 'research_only', 'cleared')),
  captured_at TEXT,
  source_created_at TEXT,
  published_at TEXT,
  imported_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  UNIQUE (project_id, archive_number),
  UNIQUE (project_id, source_id)
);

CREATE UNIQUE INDEX project_archive_entries_source_import_idx
  ON project_archive_entries (project_id, source_import_id)
  WHERE source_import_id IS NOT NULL;

CREATE INDEX project_archive_entries_public_idx
  ON project_archive_entries (project_id, status, rights_status, published_at DESC, archive_number DESC);

CREATE TABLE project_archive_media (
  entry_id TEXT NOT NULL REFERENCES project_archive_entries (id) ON DELETE CASCADE,
  media_asset_id TEXT NOT NULL REFERENCES media_assets (id) ON DELETE RESTRICT,
  role TEXT NOT NULL CHECK (role IN ('detail', 'context', 'label')),
  sort_order INTEGER NOT NULL CHECK (sort_order >= 0),
  PRIMARY KEY (entry_id, role, sort_order)
);

CREATE INDEX project_archive_media_asset_idx
  ON project_archive_media (media_asset_id);
