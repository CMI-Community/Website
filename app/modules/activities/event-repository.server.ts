import type { EventRecord } from "./event-schema";

type EventRow = {
  id: string;
  title: string;
  summary: string;
  status: "draft" | "published" | "archived";
  starts_at: string | null;
  ends_at: string | null;
  event_date: string;
  time_precision: EventRecord["timePrecision"];
  location: string;
  category: string;
  initiator: string;
  series_name: string | null;
  series_issue: number | null;
  poster_media_id: string;
  poster_alt: string;
  detail_url: string | null;
  registration_url: string | null;
  source_published_at: string | null;
  version: number;
  published_at: string | null;
  created_at: string;
  updated_at: string;
  width: number;
  height: number;
};
const SELECT_EVENT = `SELECT c.id,c.title,c.summary,c.status,c.published_at,c.created_at,c.updated_at,d.*,
 m.width,m.height FROM content_entries c JOIN event_details d ON d.content_id=c.id
 JOIN event_media m ON m.media_id=d.poster_media_id JOIN media_assets a ON a.id=m.media_id`;
export function fromEventRow(row: EventRow): EventRecord {
  return {
    id: row.id,
    title: row.title,
    summary: row.summary,
    status: row.status === "archived" ? "unpublished" : row.status,
    startsAt: row.starts_at,
    endsAt: row.ends_at,
    eventDate: row.event_date,
    timezone: "Asia/Bangkok",
    timePrecision: row.time_precision,
    location: row.location,
    category: row.category,
    initiator: row.initiator,
    series: row.series_name
      ? { name: row.series_name, issue: row.series_issue }
      : null,
    posterMediaId: row.poster_media_id,
    posterAlt: row.poster_alt,
    detailUrl: row.detail_url,
    registrationUrl: row.registration_url,
    sourcePublishedAt: row.source_published_at,
    version: row.version,
    publishedAt: row.published_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    poster: {
      url: `/media/events/${encodeURIComponent(row.id)}/${encodeURIComponent(row.poster_media_id)}`,
      width: row.width,
      height: row.height,
    },
  };
}
export async function getEvent(
  db: D1Database,
  id: string,
): Promise<EventRecord | null> {
  const row = await db
    .prepare(`${SELECT_EVENT} WHERE c.id=? AND c.type='event'`)
    .bind(id)
    .first<EventRow>();
  return row ? fromEventRow(row) : null;
}
export async function listEvents(
  db: D1Database,
  publishedOnly = false,
): Promise<EventRecord[]> {
  const where = publishedOnly
    ? "AND c.status='published' AND a.status='ready' AND m.storage='private' AND m.verified_at IS NOT NULL"
    : "";
  const rows = await db
    .prepare(
      `${SELECT_EVENT} WHERE c.type='event' ${where} ORDER BY d.event_date DESC,c.created_at DESC`,
    )
    .all<EventRow>();
  return rows.results.map(fromEventRow);
}
export async function getExternalEvent(
  db: D1Database,
  source: string,
  externalId: string,
): Promise<EventRecord | null> {
  const mapping = await db
    .prepare(
      "SELECT event_id FROM event_external_links WHERE source=? AND external_id=?",
    )
    .bind(source, externalId)
    .first<{ event_id: string }>();
  return mapping ? getEvent(db, mapping.event_id) : null;
}
export async function getEventRevisions(db: D1Database, id: string) {
  const rows = await db
    .prepare(
      "SELECT revision_number,snapshot_json,created_at FROM content_revisions WHERE content_id=? ORDER BY revision_number DESC",
    )
    .bind(id)
    .all<{
      revision_number: number;
      snapshot_json: string;
      created_at: string;
    }>();
  return rows.results.map((row) => ({
    version: row.revision_number,
    event: JSON.parse(row.snapshot_json) as EventRecord,
    createdAt: row.created_at,
  }));
}
