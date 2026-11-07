import { useState } from "react";
import type { Route } from "./+types/admin-events";
import { cloudflareContext } from "../shared/cloudflare-context";
import { listEvents } from "../modules/activities/event-repository.server";
import {
  requireAdminPage,
  privateHeaders,
} from "../modules/activities/admin.server";
import { AdminShell } from "../modules/activities/AdminShell";
export const headers = privateHeaders;
export function meta() {
  return [{ title: "活动管理｜CMI Community" }];
}
export async function loader({ request, context }: Route.LoaderArgs) {
  const { env, ctx } = context.get(cloudflareContext);
  await requireAdminPage(request, env, ctx);
  return { events: await listEvents(env.DB), environment: env.APP_ENV };
}
const labels = { draft: "草稿", published: "已发布", unpublished: "已下架" };
export default function AdminEvents({ loaderData }: Route.ComponentProps) {
  const [filter, setFilter] = useState("all");
  const [query, setQuery] = useState("");
  const events = loaderData.events.filter(
    (event) =>
      (filter === "all" || event.status === filter) &&
      event.title.includes(query),
  );
  return (
    <AdminShell title="活动管理" environment={loaderData.environment}>
      <div className="event-admin__toolbar">
        <p>可手动或自动填写，发布后在当前站点的活动页面查看。</p>
        <a className="event-admin__primary" href="/admin/events/new">
          新增活动 ＋
        </a>
      </div>
      <div className="event-admin__filters">
        <label>
          搜索标题
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="输入活动标题"
          />
        </label>
        <label>
          发布状态
          <select value={filter} onChange={(e) => setFilter(e.target.value)}>
            <option value="all">全部状态</option>
            {Object.entries(labels).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
      </div>
      {events.length ? (
        <div className="event-admin__list">
          {events.map((event) => (
            <article key={event.id}>
              <div>
                <span
                  className={`event-admin__badge event-admin__badge--${event.status}`}
                >
                  {labels[event.status]}
                </span>
                <h2>
                  <a href={`/admin/events/${encodeURIComponent(event.id)}`}>
                    {event.title}
                  </a>
                </h2>
                <p>
                  {event.timePrecision === "backfill_placeholder"
                    ? `${event.eventDate}（补录日期）`
                    : event.eventDate}{" "}
                  · {event.category} · 版本 {event.version}
                </p>
              </div>
              <a href={`/admin/events/${encodeURIComponent(event.id)}`}>
                编辑活动 →
              </a>
            </article>
          ))}
        </div>
      ) : (
        <section className="event-admin__panel">
          <h2>没有符合条件的活动</h2>
          <p>调整搜索条件，或新增第一场活动。</p>
        </section>
      )}
      <p className="event-admin__note">
        180 张历史海报保持只读，不在此列表编辑。
      </p>
    </AdminShell>
  );
}
