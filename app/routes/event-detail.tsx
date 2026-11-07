import { data } from "react-router";
import type { Route } from "./+types/event-detail";
import { cloudflareContext } from "../shared/cloudflare-context";
import { getPublicEvent } from "../modules/activities/event-public";
import "../modules/activities/admin.css";
export const headers = () => ({ "Cache-Control": "no-store, max-age=0" });
export function meta({ loaderData: loaded }: Route.MetaArgs) {
  return [
    {
      title: loaded?.event
        ? `${loaded.event.title}｜CMI Community`
        : "活动不可用｜CMI Community",
    },
    {
      name: "description",
      content: loaded?.event?.summary ?? "活动不存在或尚未公开。",
    },
  ];
}
export async function loader({ params, context }: Route.LoaderArgs) {
  const { env } = context.get(cloudflareContext);
  const event = await getPublicEvent(env.DB, params.id!);
  if (!event) throw data("活动不存在或尚未公开。", { status: 404 });
  return { event };
}
export default function EventDetail({ loaderData }: Route.ComponentProps) {
  const { event } = loaderData;
  return (
    <main className="public-event">
      <a className="event-admin__brand" href="/">
        CMI <span>Community</span>
      </a>
      <article>
        <p className="event-admin__eyebrow">{event.category}</p>
        <h1>{event.title}</h1>
        <p className="public-event__time">
          {event.dateLabel}
          {event.timeLabel && <> · {event.timeLabel}</>}
        </p>
        {event.location && <p>地点：{event.location}</p>}
        <p className="public-event__summary">{event.summary}</p>
        <img
          src={event.poster.url}
          width={event.poster.width}
          height={event.poster.height}
          alt={event.posterAlt ?? `${event.title}海报`}
        />
        <p>发起／组织：{event.initiator}</p>
        {event.series && (
          <p>
            {event.series.name}
            {event.series.issue ? ` · 第 ${event.series.issue} 期` : ""}
          </p>
        )}
        <nav className="event-admin__actions">
          {event.registrationUrl && (
            <a
              className="event-admin__primary"
              href={event.registrationUrl}
              target="_blank"
              rel="noreferrer"
            >
              报名活动 ↗
            </a>
          )}
          {event.detailUrl && (
            <a href={event.detailUrl} target="_blank" rel="noreferrer">
              查看原文 ↗
            </a>
          )}
          <a href="/#event-museum">更多社区活动</a>
        </nav>
      </article>
    </main>
  );
}
export function ErrorBoundary() {
  return (
    <main className="public-event">
      <a href="/">← CMI Community</a>
      <h1>活动暂不可用</h1>
      <p>这场活动不存在、尚未公开或已下架。</p>
    </main>
  );
}
