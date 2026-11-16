import {
  partitionActivities,
  toEventMuseumPoster,
  type ActivityDefinition,
  type EventMuseumPoster,
} from "./activity-catalog";
import { listEvents } from "./event-repository.server";
import type { EventRecord } from "./event-schema";
import { listArchiveEvents, publicArchivePoster } from "../community-content/archive-repository.server";

export interface PublicEvent extends EventRecord {
  dateLabel: string;
  timeLabel: string;
  publicUrl: string;
  seriesUrl: string | null;
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
    seriesUrl: null,
  };
}
export async function listPublicEvents(db: D1Database): Promise<PublicEvent[]> {
  const [events, memberships] = await Promise.all([
    listEvents(db, true),
    db.prepare("SELECT m.event_id,s.name,s.slug,s.status FROM activity_series_memberships m JOIN community_series s ON s.id=m.series_id").all<{ event_id: string; name: string; slug: string; status: string }>(),
  ]);
  const seriesByEvent = new Map(memberships.results.map(item => [item.event_id, item]));
  return events.map(event => {
    const series = seriesByEvent.get(event.id);
    return {
      ...displayEvent(series ? { ...event, series: { name: series.name, issue: event.series?.name === series.name ? event.series.issue : null } } : event),
      seriesUrl: series?.status === "published" ? `/series/${encodeURIComponent(series.slug)}` : null,
    };
  });
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
  const activities = await listPublicActivities(env.DB);
  let historical: EventMuseumPoster[] = [];
  let unavailable = false;
  try {
    historical = (await listArchiveEvents(env, true)).map(publicArchivePoster);
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
