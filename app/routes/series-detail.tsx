import { data, isRouteErrorResponse, useRouteError } from "react-router";
import type { Route } from "./+types/series-detail";
import { cloudflareContext } from "../shared/cloudflare-context";
import { getSeries, listPhotos, listSeriesEvents } from "../modules/community-content/content-repository.server";
import { listSeriesArchiveEvents } from "../modules/community-content/archive-repository.server";
import { ContentGallery } from "../modules/community-content/content-gallery";
import { archivePosterImage } from "../modules/community-content/content-client";
import "../modules/activities/admin.css";
import "../modules/community-content/content.css";

export const headers = () => ({ "Cache-Control": "no-store, max-age=0" });
export function meta({ loaderData }: Route.MetaArgs) {
  return [{ title: loaderData?.series ? `${loaderData.series.name}｜CMI Community` : "系列栏目｜CMI Community" }, { name: "description", content: loaderData?.series.description ?? "CMI Community 社区系列与活动。" }];
}
export async function loader({ context, params }: Route.LoaderArgs) {
  const { env } = context.get(cloudflareContext);
  const series = await getSeries(env.DB, params.slug!, true);
  if (!series) throw data("栏目不存在或尚未公开。", { status: 404 });
  const [photos, events, archive] = await Promise.all([
    listPhotos(env.DB, true), listSeriesEvents(env.DB, series.id),
    listSeriesArchiveEvents(env, series.id).then(events => ({ available: true as const, events })).catch(() => ({ available: false as const, events: [] })),
  ]);
  return { series, photos: photos.filter(photo => photo.seriesId === series.id), events, archiveEvents: archive.events, archiveAvailable: archive.available };
}

export default function SeriesDetail({ loaderData }: Route.ComponentProps) {
  const { series, photos, events, archiveEvents } = loaderData;
  return <main className="community-series">
    <header className="community-series__nav"><a className="event-admin__brand" href="/">CMI <span>Community</span></a><a href="/series">← 全部系列</a></header>
    <div className="community-series__intro community-series__intro--detail">
      {series.logoUrl && <img src={series.logoUrl} alt={`${series.name} Logo`} className="community-series__logo" />}
      <div><p className="event-admin__eyebrow">COMMUNITY SERIES</p><h1>{series.name}</h1>{series.description && <p className="community-series__description">{series.description}</p>}</div>
    </div>
    <nav className="community-series__anchors" aria-label="栏目内容"><a href="#series-events">活动{loaderData.archiveAvailable ? ` · ${events.length + archiveEvents.length}` : ""}</a><a href="#series-photos">照片 · {photos.length}</a></nav>
    <section id="series-events" className="community-series__section"><h2>系列活动</h2>
      {!loaderData.archiveAvailable && <p className="community-series__empty" role="status">历史活动暂时无法加载，请稍后刷新。</p>}
      {events.length + archiveEvents.length ? <div className="content-grid content-grid--events">
        {events.map(event => <article className="content-card" key={event.id}>
          <a className="content-card__poster" href={event.publicUrl}><img src={event.poster.url} alt={event.posterAlt || `${event.title}海报`} width={event.poster.width} height={event.poster.height} loading="lazy" decoding="async" /></a>
          <div className="content-card__body"><p className="content-card__date">{event.dateLabel}{event.timeLabel ? ` · ${event.timeLabel}` : ""}</p><h3><a href={event.publicUrl}>{event.title}</a></h3>{event.location && <p>{event.location}</p>}<p className="content-card__summary">{event.summary}</p><a href={event.publicUrl}>查看活动 →</a></div>
        </article>)}
        {archiveEvents.map(event => <article className="content-card" key={`archive-${event.id}`}>
          <a className="content-card__poster" href={event.articleUrl} target="_blank" rel="noreferrer"><img src={archivePosterImage(event.imagePath)} alt={`${event.title}海报`} width={event.width} height={event.height} loading="lazy" decoding="async" /></a>
          <div className="content-card__body">{event.eventTime && <p className="content-card__date">{event.eventTime}</p>}<h3><a href={event.articleUrl} target="_blank" rel="noreferrer">{event.title}</a></h3><p className="content-card__summary">{event.summary}</p><a href={event.articleUrl} target="_blank" rel="noreferrer">查看活动原文 ↗</a></div>
        </article>)}
      </div> : loaderData.archiveAvailable ? <p className="community-series__empty">这个系列的活动正在整理。</p> : null}
    </section>
    <section id="series-photos" className="community-series__section"><h2>一起留下的现场</h2>{photos.length ? <ContentGallery photos={photos} /> : <p className="community-series__empty">这个系列的照片正在整理。</p>}</section>
    <a href="/series">← 浏览更多系列</a>
  </main>;
}
export function ErrorBoundary() {
  const error = useRouteError();
  const missing = isRouteErrorResponse(error) && error.status === 404;
  return <main className="community-series"><a href="/series">← 全部系列</a><h1>{missing ? "栏目暂不可用" : "暂时无法加载栏目"}</h1><p>{missing ? "这个栏目不存在、尚未公开或已下架。" : "请稍后刷新重试。"}</p></main>;
}
