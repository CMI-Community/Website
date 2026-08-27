#!/usr/bin/env node
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { deflateSync } from "node:zlib";
import { Miniflare } from "miniflare";

const PROJECT_ID = "waytoagi-skills-exchange-chiang-mai-26";
const BUCKET_NAME = "cmi-community-public-assets";
const PREFIX = "projects/waytoagi/26-lanna-museum/v1/archive/media";
const FIXTURES = [
  {
    id: "lanna-e2e-media-detail",
    role: "detail",
    objectKey: `${PREFIX}/lanna-e2e-detail.png`,
    alt: "Automated test pattern close-up",
    colors: [[92, 38, 131], [236, 118, 35]],
  },
  {
    id: "lanna-e2e-media-context",
    role: "context",
    objectKey: `${PREFIX}/lanna-e2e-context.png`,
    alt: "Automated test pattern context",
    colors: [[53, 17, 73], [251, 248, 241]],
  },
];

function crc32(bytes) {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) {
      crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function pngChunk(type, data) {
  const typeBytes = Buffer.from(type, "ascii");
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.byteLength);
  const checksum = Buffer.alloc(4);
  checksum.writeUInt32BE(crc32(Buffer.concat([typeBytes, data])));
  return Buffer.concat([length, typeBytes, data, checksum]);
}

export function patternPng(width, height, colors) {
  const stride = width * 4 + 1;
  const raw = Buffer.alloc(stride * height);
  for (let y = 0; y < height; y += 1) {
    const row = y * stride;
    raw[row] = 0;
    for (let x = 0; x < width; x += 1) {
      const color = colors[(Math.floor(x / 120) + Math.floor(y / 100)) % colors.length];
      const pixel = row + 1 + x * 4;
      raw[pixel] = color[0];
      raw[pixel + 1] = color[1];
      raw[pixel + 2] = color[2];
      raw[pixel + 3] = 255;
    }
  }
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0);
  header.writeUInt32BE(height, 4);
  header[8] = 8;
  header[9] = 6;
  return Buffer.concat([
    Buffer.from("89504e470d0a1a0a", "hex"),
    pngChunk("IHDR", header),
    pngChunk("IDAT", deflateSync(raw, { level: 9 })),
    pngChunk("IEND", Buffer.alloc(0)),
  ]);
}

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

export async function main() {
  const countResult = JSON.parse(
    d1(`SELECT COUNT(*) AS count FROM project_archive_entries WHERE project_id = '${PROJECT_ID}' AND status = 'published' AND rights_status = 'cleared';`),
  );
  if (Number(countResult[0]?.results?.[0]?.count ?? 0) > 0) {
    process.stdout.write("Lanna E2E seed skipped: the local database already has a cleared public archive.\n");
    return;
  }

  const files = FIXTURES.map((fixture) => {
    const bytes = patternPng(1200, 800, fixture.colors);
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
          contentType: "image/png",
          cacheControl: "public, max-age=31536000, immutable",
        },
      });
    }
  } finally {
    await miniflare.dispose();
  }

  const mediaSql = files.map((file) =>
    `INSERT INTO media_assets (id, object_key, mime_type, byte_size, alt_text, status, created_by, checksum_sha256, source_system, rights_status) VALUES (${sqlText(file.id)}, ${sqlText(file.objectKey)}, 'image/png', ${file.byteSize}, ${sqlText(file.alt)}, 'ready', 'lanna-e2e-user', ${sqlText(file.sha256)}, 'e2e-fixture', 'cleared');`,
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

const isDirectRun = process.argv[1]
  ? import.meta.url === pathToFileURL(resolve(process.argv[1])).href
  : false;
if (isDirectRun) {
  main().catch((error) => {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 1;
  });
}
