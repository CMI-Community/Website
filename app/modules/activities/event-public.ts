import {
  partitionActivities,
  toEventMuseumPoster,
  type ActivityDefinition,
  type EventMuseumPoster,
} from "./activity-catalog";
import { listEvents } from "./event-repository.server";
import type { EventRecord } from "./event-schema";

export interface PublicEvent extends EventRecord {
  dateLabel: string;
  timeLabel: string;
  publicUrl: string;
}
function displayEvent(event: EventRecord): PublicEvent {
  const dateLabel =
    event.timePrecision === "backfill_placeholder"
      ? "2026.07.10（补录日期）"
      : `${event.eventDate.replaceAll("-", ".")} · ${new Intl.DateTimeFormat("zh-CN", { timeZone: "Asia/Bangkok", weekday: "short" }).format(new Date(event.startsAt!))}`;
  const formatTime = (value: string) =>
    new Intl.DateTimeFormat("en-GB", {
      timeZone: "Asia/Bangkok",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).format(new Date(value));
  const timeLabel =
    event.timePrecision === "backfill_placeholder"
      ? ""
      : `${formatTime(event.startsAt!)}–${formatTime(event.endsAt!)} · 清迈时间`;
  return {
    ...event,
    dateLabel,
    timeLabel,
    publicUrl: `/events/${encodeURIComponent(event.id)}`,
  };
}
export async function listPublicEvents(db: D1Database): Promise<PublicEvent[]> {
  return (await listEvents(db, true)).map(displayEvent);
}
export async function getPublicEvent(
  db: D1Database,
  id: string,
): Promise<PublicEvent | null> {
  // The shared published query checks private-media verification as well as status.
  return (await listPublicEvents(db)).find((event) => event.id === id) ?? null;
}
export async function listPublicActivities(
  db: D1Database,
): Promise<ActivityDefinition[]> {
  return (await listPublicEvents(db)).map((event) => ({
    id: event.id,
    title: event.title,
    startsAt: event.startsAt,
    endsAt: event.endsAt,
    eventDate: event.eventDate,
    timePrecision: event.timePrecision,
    dateLabel: event.dateLabel,
    timeLabel: event.timeLabel,
    publishedAt: event.sourcePublishedAt ?? "",
    publishedDate: event.sourcePublishedAt?.slice(0, 10) ?? "",
    detailUrl: event.publicUrl,
    summary: event.summary,
    initiator: event.initiator,
    category: event.category,
    location: event.location,
    registrationUrl: event.registrationUrl,
    poster: {
      objectKey: `events/${event.id}/${event.posterMediaId}`,
      publicPath: event.poster.url,
      width: event.poster.width,
      height: event.poster.height,
      alt: event.posterAlt ?? `${event.title}海报`,
    },
    series: {
      id: event.series?.name ?? "",
      name: event.series?.name ?? "",
      issue: event.series?.issue ?? null,
    },
  }));
}

/** One catalog projection for the homepage, archive and public API. */
export async function loadPublicPosterCatalog(
  env: { DB: D1Database; MEDIA: R2Bucket },
  referenceTime: Date = new Date(),
): Promise<{ posters: EventMuseumPoster[]; unavailable: boolean }> {
  // Load managed identities even for hidden events. A stale historical duplicate must
  // never make an unpublished managed event visible again.
  const [activities, managed, originals] = await Promise.all([
    listPublicActivities(env.DB),
    listEvents(env.DB),
    env.DB.prepare(
      "SELECT event_id,original_json FROM event_migration_records",
    ).all<{ event_id: string; original_json: string }>(),
  ]);
  const ids = new Set(
    managed.flatMap((event) => [event.id, `activity-${event.id}.webp`]),
  );
  const urls = new Set(managed.map((event) => event.detailUrl).filter(Boolean));
  for (const row of originals.results) {
    const original = JSON.parse(row.original_json) as { detailUrl?: string };
    if (original.detailUrl) urls.add(original.detailUrl);
    ids.add(row.event_id);
    ids.add(`activity-${row.event_id}.webp`);
  }
  let historical: EventMuseumPoster[] = [];
  let unavailable = false;
  try {
    const object = await env.MEDIA.get("poster-wall/v1/catalog.json");
    if (!object) throw new Error("catalog missing");
    const parsed = (await object.json()) as
      { posters?: EventMuseumPoster[] } | EventMuseumPoster[];
    const posters = Array.isArray(parsed) ? parsed : parsed.posters;
    if (!Array.isArray(posters) || !posters.length)
      throw new Error("catalog empty");
    historical = posters.filter(
      (poster) => !ids.has(poster.id) && !urls.has(poster.articleUrl),
    );
  } catch {
    unavailable = true;
  }
  const published = partitionActivities(
    activities,
    referenceTime,
  ).museumReady.map(toEventMuseumPoster);
  return {
    posters: [...published, ...historical],
    unavailable: unavailable && published.length === 0,
  };
}
