import {
  sanitizePhotoCatalog,
  type PhotoRecord,
} from "../photo-museum/photo-catalog";
import type {
  CommunityPhoto,
  CommunitySeries,
  EventSeriesMembership,
} from "./content-schema";

export const SERIES_SELECT = `SELECT id,slug,name,description,logo_media_id AS logoMediaId,status,sort_order AS sortOrder,version,created_at AS createdAt,updated_at AS updatedAt FROM community_series`;
export const PHOTO_SELECT = `SELECT p.id,p.alt,p.media_id AS mediaId,p.legacy_full_path AS legacyFullPath,p.legacy_thumbnail_path AS legacyThumbnailPath,p.width,p.height,p.status,p.series_id AS seriesId,p.event_id AS eventId,p.sort_order AS sortOrder,p.version,p.created_at AS createdAt,p.updated_at AS updatedAt FROM community_photos p`;
const PUBLIC_PHOTO = `p.status='published' AND (p.event_id IS NULL OR EXISTS(SELECT 1 FROM content_entries c WHERE c.id=p.event_id AND c.status='published')) AND (p.media_id IS NULL OR EXISTS(SELECT 1 FROM media_assets a JOIN event_media m ON m.media_id=a.id WHERE a.id=p.media_id AND a.status='ready' AND m.storage='private' AND m.verified_at IS NOT NULL))`;
type SeriesRow = Omit<CommunitySeries, "logoUrl">;
type PhotoRow = Omit<CommunityPhoto, "url" | "thumbnailUrl">;
const seriesRecord = (row: SeriesRow): CommunitySeries => ({
  ...row,
  logoUrl: row.logoMediaId
    ? `/media/community/series/${encodeURIComponent(row.id)}/logo`
    : null,
});
const photoRecord = (row: PhotoRow): CommunityPhoto => ({
  ...row,
  url: `/media/community/photos/${encodeURIComponent(row.id)}`,
  thumbnailUrl: row.legacyThumbnailPath
    ? `/media/community/photos/${encodeURIComponent(row.id)}?thumbnail=1`
    : `/media/community/photos/${encodeURIComponent(row.id)}`,
});
export async function listSeries(
  db: D1Database,
  publishedOnly = false,
): Promise<CommunitySeries[]> {
  const rows = await db
    .prepare(
      `${SERIES_SELECT} ${publishedOnly ? "WHERE status='published'" : ""} ORDER BY sort_order,name,id`,
    )
    .all<SeriesRow>();
  return rows.results.map(seriesRecord);
}
export async function getSeries(
  db: D1Database,
  id: string,
  publishedOnly = false,
): Promise<CommunitySeries | null> {
  const row = await db
    .prepare(
      `${SERIES_SELECT} WHERE (id=?1 OR slug=?1) ${publishedOnly ? "AND status='published'" : ""}`,
    )
    .bind(id)
    .first<SeriesRow>();
  return row ? seriesRecord(row) : null;
}
export async function listPhotos(
  db: D1Database,
  publishedOnly = false,
): Promise<CommunityPhoto[]> {
  const rows = await db
    .prepare(
      `${PHOTO_SELECT} ${publishedOnly ? `WHERE ${PUBLIC_PHOTO}` : ""} ORDER BY p.sort_order,p.created_at DESC,p.id`,
    )
    .all<PhotoRow>();
  return rows.results.map(photoRecord);
}
export async function getPhoto(
  db: D1Database,
  id: string,
  publishedOnly = false,
): Promise<CommunityPhoto | null> {
  const row = await db
    .prepare(
      `${PHOTO_SELECT} WHERE p.id=?1 ${publishedOnly ? `AND ${PUBLIC_PHOTO}` : ""}`,
    )
    .bind(id)
    .first<PhotoRow>();
  return row ? photoRecord(row) : null;
}
export async function getEventSeriesMemberships(
  db: D1Database,
): Promise<EventSeriesMembership[]> {
  return (
    await db
      .prepare(
        "SELECT event_id AS eventId,series_id AS seriesId,version FROM activity_series_memberships",
      )
      .all<EventSeriesMembership>()
  ).results;
}
export async function listSeriesEvents(db: D1Database, seriesId: string) {
  const { listPublicEvents } = await import("../activities/event-public");
  const [events, memberships] = await Promise.all([
    listPublicEvents(db),
    getEventSeriesMemberships(db),
  ]);
  const ids = new Set(
    memberships
      .filter((row) => row.seriesId === seriesId)
      .map((row) => row.eventId),
  );
  return events.filter((event) => ids.has(event.id));
}
export async function loadMuseumPhotoCatalog(
  env: Pick<CloudflareEnv, "DB" | "MEDIA">,
): Promise<PhotoRecord[]> {
  const [photos, imported] = await Promise.all([
    listPhotos(env.DB, true),
    env.DB.prepare(
      "SELECT 1 FROM community_imports WHERE id='photo-museum/v2'",
    ).first(),
  ]);
  const managed = photos.map((photo, index) => ({
    id: photo.id,
    alt: photo.alt,
    width: photo.width,
    height: photo.height,
    displayOrder: index + 1,
    thumbnailPath: photo.thumbnailUrl,
    fullPath: photo.url,
  }));
  if (imported) return managed;
  const object = await env.MEDIA.get("photo-museum/v2/catalog.json");
  if (!object) return managed;
  const original = sanitizePhotoCatalog(await object.json()).photos.map(
    (photo) => ({
      ...photo,
      thumbnailPath: `/media/photo-museum/v2/${photo.thumbnailPath}`,
      fullPath: `/media/photo-museum/v2/${photo.fullPath}`,
    }),
  );
  // A partially imported hidden row must suppress its historical fallback too.
  const ids = new Set((await listPhotos(env.DB)).map((photo) => photo.id));
  return [...managed, ...original.filter((photo) => !ids.has(photo.id))].map(
    (photo, index) => ({ ...photo, displayOrder: index + 1 }),
  );
}
