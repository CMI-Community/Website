import type { Route } from "./+types/series-index";
import { cloudflareContext } from "../shared/cloudflare-context";
import { listSeries } from "../modules/community-content/content-repository.server";
import "../modules/activities/admin.css";
import "../modules/community-content/content.css";

export const headers = () => ({ "Cache-Control": "no-store, max-age=0" });
export function meta() { return [{ title: "社区系列｜CMI Community" }, { name: "description", content: "按系列探索 CMI Community 的社区活动与现场照片。" }]; }
export async function loader({ context }: Route.LoaderArgs) {
  const { env } = context.get(cloudflareContext);
  return { series: await listSeries(env.DB, true) };
}
export default function SeriesIndex({ loaderData }: Route.ComponentProps) {
  return <main className="community-series">
    <header className="community-series__nav"><a className="event-admin__brand" href="/">CMI <span>Community</span></a><a href="/#event-museum">所有活动 →</a></header>
    <div className="community-series__intro"><p className="event-admin__eyebrow">COMMUNITY SERIES</p><h1>从一个系列开始</h1><p>找到你感兴趣的栏目，看看我们一起做过的事。</p></div>
    {loaderData.series.length ? <div className="content-grid content-grid--series">
      {loaderData.series.map(series => <a className="content-card community-series__card" key={series.id} href={`/series/${encodeURIComponent(series.slug)}`}>
        {series.logoUrl ? <img src={series.logoUrl} alt={`${series.name} Logo`} className="community-series__logo" loading="lazy" /> : <span className="community-series__logo community-series__logo--empty" aria-hidden="true">{series.name.slice(0, 1)}</span>}
        <h2>{series.name}</h2>{series.description && <p className="content-card__summary">{series.description}</p>}<span className="community-series__enter">浏览系列 →</span>
      </a>)}
    </div> : <section className="community-series__empty"><h2>系列栏目正在整理</h2><p>你可以先浏览社区的全部活动。</p><a href="/#event-museum">浏览社区活动 →</a></section>}
  </main>;
}
