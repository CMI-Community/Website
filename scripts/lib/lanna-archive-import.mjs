import { createHash, randomUUID } from "node:crypto";
import { readFileSync, statSync } from "node:fs";
import { extname, join, normalize, sep } from "node:path";

export const LANNA_PROJECT_ID = "waytoagi-skills-exchange-chiang-mai-26";
export const LANNA_SOURCE_SYSTEM = "supabase:osqyplgctlzdlpqmzfud";
export const LANNA_R2_PREFIX = "projects/waytoagi/26-lanna-museum/v1";

const MEDIA_GROUPS = [
  ["detail_image_urls", "detail"],
  ["context_image_urls", "context"],
  ["label_image_urls", "label"],
];

function requiredText(value, field) {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`${field} must be a non-empty string`);
  }
  return value.trim();
}

function optionalText(value) {
  return typeof value === "string" ? value.trim() : "";
}

function stringArray(value, field) {
  if (value == null) return [];
  if (!Array.isArray(value) || value.some((item) => typeof item !== "string")) {
    throw new Error(`${field} must be a string array`);
  }
  return value.map((item) => item.trim()).filter(Boolean);
}

function storagePathFromUrl(value) {
  const url = new URL(requiredText(value, "storage URL"));
  const marker = "/storage/v1/object/public/pattern-submissions/";
  const index = url.pathname.indexOf(marker);
  if (url.protocol !== "https:" || index < 0) {
    throw new Error(`Unsupported pattern-submissions URL: ${url.toString()}`);
  }
  const decoded = decodeURIComponent(url.pathname.slice(index + marker.length));
  const normalized = normalize(decoded).replaceAll(sep, "/");
  if (!normalized || normalized.startsWith("../") || normalized.includes("/../")) {
    throw new Error(`Unsafe storage object path: ${decoded}`);
  }
  return normalized;
}

function mimeTypeFor(path) {
  const extension = extname(path).toLowerCase();
  if (extension === ".png") return "image/png";
  if (extension === ".webp") return "image/webp";
  if (extension === ".jpg" || extension === ".jpeg") return "image/jpeg";
  throw new Error(`Unsupported archive media type: ${extension || "none"}`);
}

function hashFile(path) {
  const bytes = readFileSync(path);
  return {
    checksum: createHash("sha256").update(bytes).digest("hex"),
    byteSize: statSync(path).size,
  };
}

function stableId(namespace, value) {
  return `${namespace}-${createHash("sha256").update(value).digest("hex").slice(0, 32)}`;
}

function sqlText(value) {
  return `'${String(value).replaceAll("'", "''")}'`;
}

function sqlNullable(value) {
  return value == null || value === "" ? "NULL" : sqlText(value);
}

function sqlJson(value) {
  return sqlText(JSON.stringify(value));
}

function normalizeRows(input) {
  const rows = Array.isArray(input) ? input : input?.rows;
  if (!Array.isArray(rows)) throw new Error("Input must be an array or an object with rows");
  return rows;
}

export function buildLannaArchiveImport({
  input,
  storageRoot,
  createdBy,
  snapshotAt,
}) {
  const rows = normalizeRows(input);
  if (!storageRoot) throw new Error("storageRoot is required");
  requiredText(createdBy, "createdBy");
  requiredText(snapshotAt, "snapshotAt");

  const archiveNumbers = new Set();
  const entries = [];
  const media = [];

  for (const source of rows) {
    const archiveNumber = requiredText(source.archive_number, "archive_number");
    if (archiveNumbers.has(archiveNumber)) {
      throw new Error(`Duplicate archive number: ${archiveNumber}`);
    }
    archiveNumbers.add(archiveNumber);
  }

  for (const source of rows) {
    const sourceId = requiredText(source.id, "id");
    const archiveNumber = requiredText(source.archive_number, "archive_number");

    const entryId = stableId("project-entry", `${LANNA_PROJECT_ID}:${sourceId}`);
    const status = source.status === "published"
      ? "published"
      : source.status === "hidden"
        ? "hidden"
        : "archived";
    const rightsStatus = source.rights_review === true ? "cleared" : "unknown";

    entries.push({
      id: entryId,
      projectId: LANNA_PROJECT_ID,
      sourceSystem: LANNA_SOURCE_SYSTEM,
      sourceId,
      sourceImportId: optionalText(source.source_import_id) || null,
      archiveNumber,
      museumId: requiredText(source.museum, "museum"),
      sourceTitle: requiredText(source.source_title, "source_title"),
      sourceLocation: optionalText(source.source_location),
      observation: optionalText(source.observation),
      verifiedInformation: optionalText(source.verified_information),
      openQuestion: optionalText(source.open_question),
      carrierTags: stringArray(source.carrier_tags, "carrier_tags"),
      positionTags: stringArray(source.position_tags, "position_tags"),
      structureTags: stringArray(source.structure_tags, "structure_tags"),
      materialTags: stringArray(source.material_tags, "material_tags"),
      collectorName: optionalText(source.collector_name) || "匿名采集者",
      status,
      rightsStatus,
      capturedAt: optionalText(source.captured_at) || null,
      sourceCreatedAt: optionalText(source.created_at) || null,
      publishedAt: optionalText(source.published_at) || null,
    });

    for (const [sourceField, role] of MEDIA_GROUPS) {
      const urls = stringArray(source[sourceField], sourceField);
      for (const [order, url] of urls.entries()) {
        const sourcePath = storagePathFromUrl(url);
        const localPath = join(storageRoot, ...sourcePath.split("/"));
        const { checksum, byteSize } = hashFile(localPath);
        const extension = extname(sourcePath).toLowerCase().replace(".jpeg", ".jpg");
        const objectKey = `${LANNA_R2_PREFIX}/archive/${archiveNumber.toLowerCase()}/${role}/${String(order + 1).padStart(2, "0")}-${checksum.slice(0, 16)}${extension}`;
        media.push({
          id: stableId("project-media", `${sourceId}:${role}:${order}:${sourcePath}`),
          entryId,
          role,
          order,
          sourcePath,
          objectKey,
          mimeType: mimeTypeFor(sourcePath),
          byteSize,
          checksum,
          altText: `${archiveNumber} ${role === "detail" ? "纹样局部" : role === "context" ? "完整载体" : "展签或来源"} ${order + 1}`,
          rightsStatus,
        });
      }
    }
  }

  const canonical = JSON.stringify({ entries, media });
  const manifestSha256 = createHash("sha256").update(canonical).digest("hex");
  const importId = stableId("project-import", manifestSha256);
  const totalBytes = media.reduce((sum, item) => sum + item.byteSize, 0);
  const manifest = {
    version: "cmi-project-archive-import/v1",
    projectId: LANNA_PROJECT_ID,
    sourceSystem: LANNA_SOURCE_SYSTEM,
    snapshotAt,
    manifestSha256,
    recordCount: entries.length,
    objectCount: media.length,
    totalBytes,
    entries,
    media,
  };

  const statements = [
    `INSERT INTO project_archive_imports (id, project_id, source_system, source_snapshot_at, record_count, object_count, total_bytes, manifest_sha256, status) VALUES (${sqlText(importId)}, ${sqlText(LANNA_PROJECT_ID)}, ${sqlText(LANNA_SOURCE_SYSTEM)}, ${sqlText(snapshotAt)}, ${entries.length}, ${media.length}, ${totalBytes}, ${sqlText(manifestSha256)}, 'verified') ON CONFLICT (project_id, source_system, manifest_sha256) DO UPDATE SET record_count = excluded.record_count, object_count = excluded.object_count, total_bytes = excluded.total_bytes, status = 'verified';`,
  ];

  for (const entry of entries) {
    statements.push(
      `INSERT INTO project_archive_entries (id, project_id, source_system, source_id, source_import_id, archive_number, museum_id, source_title, source_location, observation, verified_information, open_question, carrier_tags_json, position_tags_json, structure_tags_json, material_tags_json, collector_name, status, rights_status, captured_at, source_created_at, published_at) VALUES (${sqlText(entry.id)}, ${sqlText(entry.projectId)}, ${sqlText(entry.sourceSystem)}, ${sqlText(entry.sourceId)}, ${sqlNullable(entry.sourceImportId)}, ${sqlText(entry.archiveNumber)}, ${sqlText(entry.museumId)}, ${sqlText(entry.sourceTitle)}, ${sqlText(entry.sourceLocation)}, ${sqlText(entry.observation)}, ${sqlText(entry.verifiedInformation)}, ${sqlText(entry.openQuestion)}, ${sqlJson(entry.carrierTags)}, ${sqlJson(entry.positionTags)}, ${sqlJson(entry.structureTags)}, ${sqlJson(entry.materialTags)}, ${sqlText(entry.collectorName)}, ${sqlText(entry.status)}, ${sqlText(entry.rightsStatus)}, ${sqlNullable(entry.capturedAt)}, ${sqlNullable(entry.sourceCreatedAt)}, ${sqlNullable(entry.publishedAt)}) ON CONFLICT (id) DO UPDATE SET source_import_id = excluded.source_import_id, archive_number = excluded.archive_number, museum_id = excluded.museum_id, source_title = excluded.source_title, source_location = excluded.source_location, observation = excluded.observation, verified_information = excluded.verified_information, open_question = excluded.open_question, carrier_tags_json = excluded.carrier_tags_json, position_tags_json = excluded.position_tags_json, structure_tags_json = excluded.structure_tags_json, material_tags_json = excluded.material_tags_json, collector_name = excluded.collector_name, status = excluded.status, rights_status = excluded.rights_status, captured_at = excluded.captured_at, source_created_at = excluded.source_created_at, published_at = excluded.published_at;`,
    );
  }

  for (const item of media) {
    statements.push(
      `INSERT INTO media_assets (id, object_key, mime_type, byte_size, alt_text, status, created_by, checksum_sha256, source_system, rights_status) VALUES (${sqlText(item.id)}, ${sqlText(item.objectKey)}, ${sqlText(item.mimeType)}, ${item.byteSize}, ${sqlText(item.altText)}, 'ready', ${sqlText(createdBy)}, ${sqlText(item.checksum)}, ${sqlText(LANNA_SOURCE_SYSTEM)}, ${sqlText(item.rightsStatus)}) ON CONFLICT (id) DO UPDATE SET object_key = excluded.object_key, mime_type = excluded.mime_type, byte_size = excluded.byte_size, alt_text = excluded.alt_text, status = 'ready', checksum_sha256 = excluded.checksum_sha256, source_system = excluded.source_system, rights_status = excluded.rights_status, updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now');`,
    );
    statements.push(
      `INSERT INTO project_archive_media (entry_id, media_asset_id, role, sort_order) VALUES (${sqlText(item.entryId)}, ${sqlText(item.id)}, ${sqlText(item.role)}, ${item.order}) ON CONFLICT (entry_id, role, sort_order) DO UPDATE SET media_asset_id = excluded.media_asset_id;`,
    );
  }

  statements.push(
    `INSERT INTO audit_logs (id, actor_user_id, action, resource_type, resource_id, metadata_json) VALUES (${sqlText(randomUUID())}, ${sqlText(createdBy)}, 'project.archive.imported', 'project_archive_import', ${sqlText(importId)}, ${sqlJson({ projectId: LANNA_PROJECT_ID, manifestSha256, recordCount: entries.length, objectCount: media.length, totalBytes })});`,
  );

  return { manifest, sql: `${statements.join("\n")}\n` };
}
