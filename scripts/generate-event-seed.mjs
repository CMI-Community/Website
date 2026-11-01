// Reconstruct the initial SQL from the preserved public source catalog.
// Prints SQL to stdout. It does not access D1, R2, credentials or the network.
import { build } from "esbuild";
const built = await build({
  entryPoints: ["app/modules/activities/activity-catalog.ts"],
  bundle: true,
  platform: "node",
  format: "esm",
  write: false,
});
const { ACTIVITY_CATALOG } = await import(
  `data:text/javascript;base64,${Buffer.from(built.outputFiles[0].text).toString("base64")}`
);
const q = (value) =>
  value == null
    ? "NULL"
    : typeof value === "number"
      ? String(value)
      : `'${String(value).replaceAll("'", "''")}'`;
const stamp = "2026-11-01T00:00:00.000Z";
const owner = "event-migration-system";
const statements = [
  "\n-- BEGIN GENERATED PUBLIC EVENT SEED (scripts/generate-event-seed.mjs)",
  `INSERT INTO auth_users(id,name,email,emailVerified,createdAt,updatedAt) VALUES(${q(owner)},'Activity migration','activity-migration@invalid.example.com',0,1793491200000,1793491200000);`,
];
for (const activity of ACTIVITY_CATALOG) {
  const backfill = activity.id.startsWith("cmi-ai-3d-school-workshop-");
  const mediaId = `event-poster-${activity.id}`;
  const objectKey = `events/legacy/${activity.id}/v1/poster.webp`;
  const summary = activity.summary + (backfill ? " 该时间为后期补录" : "");
  const event = {
    id: activity.id,
    title: activity.title,
    summary,
    status: "published",
    startsAt: backfill ? null : activity.startsAt,
    endsAt: backfill ? null : activity.endsAt,
    eventDate: backfill ? "2026-07-10" : activity.startsAt.slice(0, 10),
    timezone: "Asia/Bangkok",
    timePrecision: backfill ? "backfill_placeholder" : "exact",
    location: "",
    category: activity.category,
    initiator: activity.initiator,
    series: { name: activity.series.name, issue: activity.series.issue },
    posterMediaId: mediaId,
    posterAlt: activity.poster.alt,
    detailUrl: activity.detailUrl,
    registrationUrl: null,
    sourcePublishedAt: activity.publishedAt,
    version: 1,
    publishedAt: stamp,
    createdAt: stamp,
    updatedAt: stamp,
    poster: {
      url: `/media/events/${activity.id}/${mediaId}`,
      width: activity.poster.width,
      height: activity.poster.height,
    },
  };
  statements.push(
    `INSERT INTO media_assets(id,object_key,mime_type,byte_size,alt_text,status,created_by,source_system,rights_status) VALUES(${[mediaId, objectKey, "image/webp", 0, activity.poster.alt, "pending", owner, "activity-catalog", "cleared"].map(q).join(",")});`,
    `INSERT INTO event_media(media_id,width,height,source,verified_at) VALUES(${[mediaId, activity.poster.width, activity.poster.height, "legacy", null].map(q).join(",")});`,
    `INSERT INTO content_entries(id,type,locale,slug,title,summary,status,created_by,updated_by,published_by,published_at,created_at,updated_at) VALUES(${[activity.id, "event", "zh-CN", activity.id, activity.title, summary, "published", owner, owner, owner, stamp, stamp, stamp].map(q).join(",")});`,
    `INSERT INTO event_details(content_id,starts_at,ends_at,event_date,time_precision,location,category,initiator,series_name,series_issue,poster_media_id,poster_alt,detail_url,registration_url,source_published_at,version) VALUES(${[activity.id, event.startsAt, event.endsAt, event.eventDate, event.timePrecision, "", activity.category, activity.initiator, activity.series.name, activity.series.issue, mediaId, activity.poster.alt, activity.detailUrl, null, activity.publishedAt, 1].map(q).join(",")});`,
    `INSERT INTO content_revisions(id,content_id,revision_number,snapshot_json,created_by,created_at) VALUES(${[`migration-${activity.id}`, activity.id, 1, JSON.stringify(event), owner, stamp].map(q).join(",")});`,
    `INSERT INTO event_migration_records(event_id,original_json,original_object_key,private_object_key,migrated_at) VALUES(${[activity.id, JSON.stringify(activity), activity.poster.objectKey, objectKey, stamp].map(q).join(",")});`,
    `INSERT INTO audit_logs(id,actor_user_id,action,resource_type,resource_id,metadata_json,created_at) VALUES(${[`migration-${activity.id}`, owner, "event.migrated", "event", activity.id, JSON.stringify({ source: "activity-catalog", version: 1, privateMediaVerified: false, backfill }), stamp].map(q).join(",")});`,
  );
}
statements.push("-- END GENERATED PUBLIC EVENT SEED\n");
process.stdout.write(statements.join("\n"));
