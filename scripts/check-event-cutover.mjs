import { execFileSync } from "node:child_process";

const target = process.argv[2];
if (!["local", "staging", "production"].includes(target)) {
  throw new Error("Choose local, staging, or production.");
}

const query = `SELECT COUNT(*) AS total,
  COUNT(CASE WHEN a.status='ready' AND a.byte_size>0
    AND length(a.checksum_sha256)=64 AND em.storage='private'
    AND em.verified_at IS NOT NULL THEN 1 END) AS ready
  FROM event_migration_records r
  LEFT JOIN media_assets a ON a.object_key=r.private_object_key
  LEFT JOIN event_media em ON em.media_id=a.id`;
const placement = target === "local" ? ["--local"] : ["--remote", "--env", target];
const result = JSON.parse(execFileSync(process.execPath, [
  "node_modules/wrangler/bin/wrangler.js",
  "d1", "execute", "DB", ...placement, "--json", "--command", query,
], { encoding: "utf8", env: { ...process.env, WRANGLER_SEND_METRICS: "false" } }));
const counts = result[0]?.results?.[0];
if (counts?.total !== 10 || counts.ready !== counts.total) {
  throw new Error(`Activity cutover blocked for ${target}: ${counts?.ready ?? 0} of 10 migrated posters verified.`);
}
console.log(`Activity cutover metadata verified for ${target}: ${counts.ready}/10 posters.`);
