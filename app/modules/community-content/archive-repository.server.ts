import type { EventMuseumPoster } from "../activities/activity-catalog";
import { listEvents } from "../activities/event-repository.server";
import { HttpError } from "../../../workers/lib/http";
import { archivePatchSchema, type PublicationStatus } from "./content-schema";
import { guardedContentBatch, parseContent } from "./content-service.server";
import type { EventAdmin } from "../../../workers/integration-auth";

export interface ArchiveEvent extends EventMuseumPoster {
  status: PublicationStatus;
  seriesId: string | null;
  version: number;
}
interface OverrideRow {
  id: string;
  title: string;
  summary: string;
  category: string;
  initiator: string;
  series_id: string | null;
  status: PublicationStatus;
  version: number;
  series_name: string | null;
  series_status: PublicationStatus | null;
}
function publicPoster(poster: EventMuseumPoster): EventMuseumPoster {
  // Catalog maintenance fields must never leak through route loader serialization.
  return {
    id: poster.id,
    imagePath: poster.imagePath,
    width: poster.width,
    height: poster.height,
    title: poster.title,
    publishedAt: poster.publishedAt,
    publishedDate: poster.publishedDate,
    eventTime: poster.eventTime,
    initiator: poster.initiator,
    summary: poster.summary,
    articleUrl: poster.articleUrl,
    category: poster.category,
    series: { name: poster.series.name, issue: poster.series.issue },
  };
}
export async function listArchiveEvents(
  env: Pick<CloudflareEnv, "DB" | "MEDIA">,
  publishedOnly = false,
): Promise<ArchiveEvent[]> {
  const [managed, originals, overrides, object] = await Promise.all([
    listEvents(env.DB),
    env.DB.prepare(
      "SELECT event_id,original_json FROM event_migration_records",
    ).all<{ event_id: string; original_json: string }>(),
    env.DB.prepare(
      "SELECT o.*,s.name AS series_name,s.status AS series_status FROM legacy_event_overrides o LEFT JOIN community_series s ON s.id=o.series_id",
    ).all<OverrideRow>(),
    env.MEDIA.get("poster-wall/v1/catalog.json"),
  ]);
  if (!object)
    throw new HttpError(503, "CATALOG_UNAVAILABLE", "历史活动目录暂时不可用。");
  const parsed = (await object.json()) as
    | { posters?: EventMuseumPoster[] }
    | EventMuseumPoster[];
  const posters = Array.isArray(parsed) ? parsed : parsed.posters;
  if (!Array.isArray(posters))
    throw new HttpError(503, "CATALOG_UNAVAILABLE", "历史活动目录暂时不可用。");
  const ids = new Set(
    managed.flatMap((event) => [event.id, `activity-${event.id}.webp`]),
  );
  const urls = new Set(managed.map((event) => event.detailUrl).filter(Boolean));
  for (const row of originals.results) {
    ids.add(row.event_id);
    ids.add(`activity-${row.event_id}.webp`);
    const original = JSON.parse(row.original_json) as { detailUrl?: string };
    if (original.detailUrl) urls.add(original.detailUrl);
  }
  const mapped = new Map(overrides.results.map((row) => [row.id, row]));
  return posters
    .filter((poster) => !ids.has(poster.id) && !urls.has(poster.articleUrl))
    .flatMap((poster): ArchiveEvent[] => {
      const override = mapped.get(poster.id);
      if (publishedOnly && override && override.status !== "published")
        return [];
      return [
        {
          ...publicPoster(poster),
          ...(override
            ? {
                title: override.title,
                summary: override.summary,
                category: override.category,
                initiator: override.initiator,
              }
            : {}),
          series: override?.series_name
            ? { name: override.series_name, issue: poster.series.issue }
            : { name: poster.series.name, issue: poster.series.issue },
          status: override?.status ?? "published",
          seriesId: override?.series_id ?? null,
          version: override?.version ?? 0,
        },
      ];
    });
}
export async function listSeriesArchiveEvents(
  env: Pick<CloudflareEnv, "DB" | "MEDIA">,
  seriesId: string,
) {
  return (await listArchiveEvents(env, true)).filter(
    (event) => event.seriesId === seriesId,
  );
}
export async function saveArchiveEvent(
  env: Pick<CloudflareEnv, "DB" | "MEDIA">,
  actor: EventAdmin,
  id: string,
  raw: unknown,
  version: number,
) {
  const event = (await listArchiveEvents(env)).find((event) => event.id === id);
  if (!event) throw new HttpError(404, "EVENT_NOT_FOUND", "历史活动不存在。");
  if (event.version !== version)
    throw new HttpError(
      409,
      "VERSION_CONFLICT",
      "历史活动已更新，请刷新后重试。",
    );
  const input = { ...event, ...parseContent(archivePatchSchema, raw) };
  if (
    input.seriesId &&
    !(await env.DB.prepare("SELECT 1 FROM community_series WHERE id=?")
      .bind(input.seriesId)
      .first())
  )
    throw new HttpError(422, "SERIES_NOT_FOUND", "所选栏目不存在。");
  await guardedContentBatch(
    env.DB,
    actor,
    [
      env.DB.prepare(
        "INSERT INTO legacy_event_overrides(id,title,summary,category,initiator,series_id,status,version,updated_at) VALUES(?,?,?,?,?,?,?,1,?) ON CONFLICT(id) DO UPDATE SET title=excluded.title,summary=excluded.summary,category=excluded.category,initiator=excluded.initiator,series_id=excluded.series_id,status=excluded.status,version=legacy_event_overrides.version+1,updated_at=excluded.updated_at",
      ).bind(
        id,
        input.title,
        input.summary,
        input.category,
        input.initiator,
        input.seriesId,
        input.status,
        new Date().toISOString(),
      ),
      env.DB.prepare(
        "INSERT INTO audit_logs(id,actor_user_id,action,resource_type,resource_id) VALUES(?,?,'archive.event.updated','archive_event',?)",
      ).bind(crypto.randomUUID(), actor.userId, id),
    ],
    version
      ? "EXISTS(SELECT 1 FROM legacy_event_overrides WHERE id=? AND version=?)"
      : "NOT EXISTS(SELECT 1 FROM legacy_event_overrides WHERE id=?)",
    version ? [id, version] : [id],
  );
  return (await listArchiveEvents(env)).find((event) => event.id === id)!;
}
