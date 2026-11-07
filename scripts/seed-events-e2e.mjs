// Local emulator fixtures only. Does not accept remote configuration or credentials.
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { resolve } from "node:path";
import { Miniflare } from "miniflare";
import { patternPng } from "./seed-lanna-e2e.mjs";

if (process.argv.length > 2 || process.env.CLOUDFLARE_ENV)
  throw new Error("Event fixtures require the default local emulator.");
function d1(sql) {
  return JSON.parse(
    execFileSync(
      process.execPath,
      [
        "node_modules/wrangler/bin/wrangler.js",
        "d1",
        "execute",
        "DB",
        "--local",
        "--command",
        sql,
        "--json",
      ],
      {
        encoding: "utf8",
        env: { ...process.env, WRANGLER_SEND_METRICS: "false" },
      },
    ),
  );
}
const text = (value) => `'${String(value).replaceAll("'", "''")}'`;
const rows = d1(
  "SELECT ma.id,ma.object_key,em.width,em.height FROM media_assets ma JOIN event_media em ON em.media_id=ma.id JOIN event_migration_records mr ON mr.private_object_key=ma.object_key WHERE ma.status='pending' AND em.verified_at IS NULL;",
)[0].results;
const mf = new Miniflare({
  modules: true,
  script:
    "export default { fetch() { return new Response('local event fixture'); } }",
  compatibilityDate: "2026-08-01",
  r2Buckets: { EVENT_MEDIA: "cmi-community-events-private-local" },
  resourcePersistencePath: resolve(".wrangler/state/v3"),
  logRequests: false,
});
let seeded = 0;
try {
  const bucket = await mf.getR2Bucket("EVENT_MEDIA");
  for (const row of rows) {
    // Never replace an existing image; production migration verifies real sources separately.
    if (await bucket.head(row.object_key)) continue;
    const bytes = patternPng(row.width, row.height, [
      [26, 64, 55],
      [222, 207, 168],
    ]);
    const hash = createHash("sha256").update(bytes).digest("hex");
    await bucket.put(row.object_key, bytes, {
      httpMetadata: { contentType: "image/png", cacheControl: "no-store" },
      customMetadata: { fixture: "synthetic-local-only", sha256: hash },
    });
    d1(
      `UPDATE media_assets SET mime_type='image/png',byte_size=${bytes.length},checksum_sha256=${text(hash)},status='ready',source_system='e2e-fixture' WHERE id=${text(row.id)} AND status='pending'; UPDATE event_media SET verified_at=strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE media_id=${text(row.id)} AND verified_at IS NULL;`,
    );
    seeded++;
  }
} finally {
  await mf.dispose();
}
console.log(
  `Seeded ${seeded} local synthetic managed posters; existing media untouched.`,
);
