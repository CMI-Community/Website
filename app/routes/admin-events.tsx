import { useState } from "react";
import type { Route } from "./+types/admin-events";
import { cloudflareContext } from "../shared/cloudflare-context";
import { listEvents } from "../modules/activities/event-repository.server";
import { requireAdminPage, privateHeaders } from "../modules/activities/admin.server";
import { AdminShell } from "../modules/activities/AdminShell";
import { getEventSeriesMemberships, listSeries } from "../modules/community-content/content-repository.server";
import { listArchiveEvents } from "../modules/community-content/archive-repository.server";
import { archivePosterImage, contentStatusLabels, matchesContentQuery } from "../modules/community-content/content-client";
import "../modules/community-content/content.css";

export const headers = privateHeaders;
export function meta() { return [{ title: "活动管理｜CMI Community" }]; }
export async function loader({ request, context }: Route.LoaderArgs) {
  const { env, ctx } = context.get(cloudflareContext);
  await requireAdminPage(request, env, ctx);
  const [events, series, memberships, archive] = await Promise.all([
    listEvents(env.DB), listSeries(env.DB), getEventSeriesMemberships(env.DB),
    listArchiveEvents(env).then(events => ({ available: true as const, events })).catch(() => ({ available: false as const, events: [] })),
  ]);
  return { events, series, memberships, archive, environment: env.APP_ENV };
}

export default function AdminEvents({ loaderData }: Route.ComponentProps) {
  const [filter, setFilter] = useState("all");
  const [query, setQuery] = useState("");
  const [seriesFilter, setSeriesFilter] = useState("all");
  const [source, setSource] = useState("all");
  const memberships = new Map(loaderData.memberships.map(item => [item.eventId, item.seriesId]));
  const nameOf = (id: string | null) => loaderData.series.find(item => item.id === id)?.name ?? "未归属栏目";
  const cards = [
    ...loaderData.events.map(event => ({
      id: event.id, source: "managed", title: event.title, status: event.status,
      date: event.timePrecision === "backfill_placeholder" ? `${event.eventDate}（补录日期）` : event.eventDate,
      category: event.category, location: event.location, summary: event.summary,
      seriesId: memberships.get(event.id) ?? null,
      originalSeries: event.series?.name ?? "", image: `/api/v1/admin/media/${encodeURIComponent(event.posterMediaId)}`,
      width: event.poster.width, height: event.poster.height,
      href: `/admin/events/${encodeURIComponent(event.id)}`,
    })),
    ...loaderData.archive.events.map(event => ({
      id: event.id, source: "archive", title: event.title, status: event.status,
      date: event.eventTime || (event.publishedAt ? `原文发布于 ${event.publishedAt}` : "活动时间待补"), category: event.category,
      location: "", summary: event.summary, seriesId: event.seriesId,
      originalSeries: event.series.name, image: archivePosterImage(event.imagePath), width: event.width, height: event.height,
      href: `/admin/archive-events/${encodeURIComponent(event.id)}`,
    })),
  ];
  const visible = cards.filter(event => (filter === "all" || event.status === filter)
    && (source === "all" || event.source === source)
    && (seriesFilter === "all" || (seriesFilter === "none" ? !event.seriesId : event.seriesId === seriesFilter))
    && matchesContentQuery(query, [event.title, event.summary, event.date, event.category, event.location, event.originalSeries, nameOf(event.seriesId)]));
  return <AdminShell title="活动管理" environment={loaderData.environment}>
    <div className="event-admin__toolbar"><p>缩略图浏览全部活动与历史海报，搜索后直接进入编辑。</p><a className="event-admin__primary" href="/admin/events/new">新增活动 ＋</a></div>
    <div className="event-admin__filters">
      <label>搜索标题<input value={query} onChange={event => setQuery(event.target.value)} placeholder="标题、时间、地点或栏目" /></label>
      <label>发布状态<select value={filter} onChange={event => setFilter(event.target.value)}><option value="all">全部状态</option>{Object.entries(contentStatusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
      <label>系列栏目<select value={seriesFilter} onChange={event => setSeriesFilter(event.target.value)}><option value="all">全部栏目</option><option value="none">未归属栏目</option>{loaderData.series.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
      <label>活动来源<select value={source} onChange={event => setSource(event.target.value)}><option value="all">全部活动</option><option value="managed">活动记录</option><option value="archive">历史海报</option></select></label>
    </div>
    {!loaderData.archive.available && <p className="event-admin__error" role="status">历史海报暂时无法加载。当前仅展示可读取的活动记录，请稍后刷新。</p>}
    <p role="status">显示 {visible.length} / {cards.length} 条{!loaderData.archive.available ? "可读取记录" : "活动与历史海报"}，图片按需加载。</p>
    {visible.length ? <div className="content-grid content-grid--events">{visible.map(event => <article className="content-card" key={`${event.source}-${event.id}`}>
      <a className="content-card__poster" href={event.href} aria-label={`编辑活动：${event.title}`}><img src={event.image} alt={`${event.title}海报`} width={event.width} height={event.height} loading="lazy" decoding="async" /></a>
      <div className="content-card__body"><span className={`event-admin__badge event-admin__badge--${event.status}`}>{contentStatusLabels[event.status]}</span>
        <p className="content-card__date">{event.date}</p><h2><a href={event.href}>{event.title}</a></h2>
        <p>{event.category}{event.location ? ` · ${event.location}` : ""}</p><p>{nameOf(event.seriesId)}</p>
        <small>{event.source === "archive" ? "历史海报 · 保留原时间记录" : "活动记录"}</small>
        <div className="event-admin__actions"><a href={event.href}>编辑活动 →</a></div>
      </div>
    </article>)}</div> : <section className="event-admin__panel"><h2>没有符合条件的活动</h2><p>调整搜索条件，或新增第一场活动。</p></section>}
  </AdminShell>;
}
