#!/usr/bin/env node
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { Miniflare } from "miniflare";

const PROJECT_ID = "waytoagi-skills-exchange-chiang-mai-26";
const BUCKET_NAME = "cmi-community-public-assets";
const PREFIX = "projects/waytoagi/26-lanna-museum/v1/archive/media";
const FIXTURES = [
  {
    id: "lanna-e2e-media-detail",
    role: "detail",
    file: resolve("tests/fixtures/lanna-e2e/detail.svg"),
    objectKey: `${PREFIX}/lanna-e2e-detail.svg`,
    alt: "Automated test pattern close-up",
  },
  {
    id: "lanna-e2e-media-context",
    role: "context",
    file: resolve("tests/fixtures/lanna-e2e/context.svg"),
    objectKey: `${PREFIX}/lanna-e2e-context.svg`,
    alt: "Automated test pattern context",
  },
];

function d1(command) {
  return execFileSync(
    "npx",
    ["wrangler", "d1", "execute", "DB", "--local", "--command", command, "--json"],
    { cwd: process.cwd(), encoding: "utf8", env: { ...process.env, NO_COLOR: "1" } },
  );
}

function sqlText(value) {
  return `'${String(value).replaceAll("'", "''")}'`;
}

async function main() {
  const countResult = JSON.parse(
    d1(`SELECT COUNT(*) AS count FROM project_archive_entries WHERE project_id = '${PROJECT_ID}' AND status = 'published' AND rights_status = 'cleared';`),
  );
  if (Number(countResult[0]?.results?.[0]?.count ?? 0) > 0) {
    process.stdout.write("Lanna E2E seed skipped: the local database already has a cleared public archive.\n");
    return;
  }

  const files = FIXTURES.map((fixture) => {
    const bytes = readFileSync(fixture.file);
    return {
      ...fixture,
      bytes,
      byteSize: bytes.byteLength,
      sha256: createHash("sha256").update(bytes).digest("hex"),
    };
  });
  const miniflare = new Miniflare({
    modules: true,
    script: "export default { fetch() { return new Response('lanna e2e seed'); } }",
    compatibilityDate: "2026-08-01",
    r2Buckets: { MEDIA: BUCKET_NAME },
    resourcePersistencePath: resolve(".wrangler/state/v3"),
    logRequests: false,
  });
  try {
    const bucket = await miniflare.getR2Bucket("MEDIA");
    for (const file of files) {
      await bucket.put(file.objectKey, file.bytes, {
        httpMetadata: {
          contentType: "image/svg+xml",
          cacheControl: "public, max-age=31536000, immutable",
        },
      });
    }
  } finally {
    await miniflare.dispose();
  }

  const mediaSql = files.map((file) =>
    `INSERT INTO media_assets (id, object_key, mime_type, byte_size, alt_text, status, created_by, checksum_sha256, source_system, rights_status) VALUES (${sqlText(file.id)}, ${sqlText(file.objectKey)}, 'image/svg+xml', ${file.byteSize}, ${sqlText(file.alt)}, 'ready', 'lanna-e2e-user', ${sqlText(file.sha256)}, 'e2e-fixture', 'cleared');`,
  ).join("\n");
  const linksSql = files.map((file, index) =>
    `INSERT INTO project_archive_media (entry_id, media_asset_id, role, sort_order) VALUES ('lanna-e2e-entry', ${sqlText(file.id)}, ${sqlText(file.role)}, ${index});`,
  ).join("\n");
  d1(`
    PRAGMA foreign_keys = ON;
    INSERT OR IGNORE INTO auth_users (id, name, email, emailVerified, createdAt, updatedAt) VALUES ('lanna-e2e-user', 'Lanna E2E', 'lanna-e2e.invalid', 1, 0, 0);
    ${mediaSql}
    INSERT INTO project_archive_entries (id, project_id, source_system, source_id, source_import_id, archive_number, museum_id, source_title, source_location, observation, verified_information, open_question, carrier_tags_json, position_tags_json, structure_tags_json, material_tags_json, collector_name, status, rights_status, captured_at, source_created_at, published_at) VALUES ('lanna-e2e-entry', '${PROJECT_ID}', 'e2e-fixture', 'lanna-e2e-source', 'lanna-e2e-import', 'CMI-LN-E2E', 'lanna_folklife', 'Rights-cleared test pattern', 'Automated browser fixture', 'OBSERVED / Repeating geometry in a controlled browser fixture.', 'VERIFIED / This record exists only in a local E2E database.', 'UNKNOWN / No cultural claim is made by this fixture.', '["textile"]', '["surface"]', '["geometric"]', '["woven"]', 'CMI CI', 'published', 'cleared', '2026-07-26T08:00:00.000Z', '2026-07-26T08:00:00.000Z', '2026-07-26T08:00:00.000Z');
    ${linksSql}
  `);
  process.stdout.write("Lanna E2E seed created one rights-cleared local archive entry and two local R2 images.\n");
}

main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
});
