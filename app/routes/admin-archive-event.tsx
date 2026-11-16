import { useState, type FormEvent } from "react";
import { data } from "react-router";
import type { Route } from "./+types/admin-archive-event";
import { cloudflareContext } from "../shared/cloudflare-context";
import { AdminShell } from "../modules/activities/AdminShell";
import { requireAdminPage, privateHeaders } from "../modules/activities/admin.server";
import { adminApi, errorMessage } from "../modules/activities/admin-client";
import { listArchiveEvents, type ArchiveEvent } from "../modules/community-content/archive-repository.server";
import { listSeries } from "../modules/community-content/content-repository.server";
import { archivePosterImage, contentStatusLabels } from "../modules/community-content/content-client";
import type { PublicationStatus } from "../modules/community-content/content-schema";
import "../modules/community-content/content.css";

export const headers = privateHeaders;
export function meta() { return [{ title: "历史活动管理｜CMI Community" }]; }
export async function loader({ context, request, params }: Route.LoaderArgs) {
  const { env, ctx } = context.get(cloudflareContext);
  await requireAdminPage(request, env, ctx);
  const [events, series] = await Promise.all([listArchiveEvents(env), listSeries(env.DB)]);
  const event = events.find(item => item.id === params.id);
  if (!event) throw data("历史活动不存在。", { status: 404 });
  return { event, series, environment: env.APP_ENV };
}
function archiveForm(event: ArchiveEvent) {
  const { title, summary, category, initiator, seriesId, status } = event;
  return { title, summary, category, initiator, seriesId, status };
}
export default function AdminArchiveEvent({ loaderData }: Route.ComponentProps) {
  const [event, setEvent] = useState(loaderData.event);
  const [form, setForm] = useState(() => archiveForm(loaderData.event));
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  async function save(submit: FormEvent<HTMLFormElement>) {
    submit.preventDefault(); setBusy(true); setError(""); setMessage("");
    try {
      const result = await adminApi<{ event: ArchiveEvent }>(`/api/v1/admin/archive-events/${encodeURIComponent(event.id)}`, {
        method: "PATCH", headers: { "If-Match": `"v${event.version}"` }, body: JSON.stringify(form),
      });
      setEvent(result.event); setForm(archiveForm(result.event));
      setMessage(`历史活动已保存 · ${contentStatusLabels[result.event.status]}`);
    } catch (failure) { setError(errorMessage(failure)); }
    finally { setBusy(false); }
  }
  return <AdminShell title="编辑历史活动" environment={loaderData.environment}>
    <a href="/admin/events">← 全部活动</a>
    <p className="event-admin__note">原始海报和时间保留；你可以修订展示信息、设置栏目及发布状态。</p>
    <div className="content-archive-editor">
      <aside><img className="content-editor__photo" src={archivePosterImage(event.imagePath)} alt={`${event.title}海报`} width={event.width} height={event.height} /><p>{event.eventTime || "原目录未记录活动时间"}</p><a href={event.articleUrl} target="_blank" rel="noreferrer">查看原文 ↗</a></aside>
      <form className="event-admin__form" onSubmit={save}><fieldset disabled={busy}>
        <label>活动标题 *<input required maxLength={160} value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} /></label>
        <label>活动简介<textarea rows={5} maxLength={2000} value={form.summary} onChange={e => setForm({ ...form, summary: e.target.value })} /></label>
        <label>活动类别<input maxLength={80} value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} /></label>
        <label>发起／组织<input maxLength={160} value={form.initiator} onChange={e => setForm({ ...form, initiator: e.target.value })} /></label>
        <label>所属系列栏目<select aria-label="所属系列栏目" value={form.seriesId ?? ""} onChange={e => setForm({ ...form, seriesId: e.target.value || null })}><option value="">未归属栏目</option>{loaderData.series.map(item => <option key={item.id} value={item.id}>{item.name}{item.status !== "published" ? `（${contentStatusLabels[item.status]}）` : ""}</option>)}</select></label>
        <label>发布状态<select aria-label="发布状态" value={form.status} onChange={e => setForm({ ...form, status: e.target.value as PublicationStatus })}>{Object.entries(contentStatusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
        {form.status !== "published" && <p className="event-admin__notice">保存后，此活动会从官网公开活动列表和系列页中隐藏，历史原文件仍保留。</p>}
        <div className="event-admin__actions"><button className="event-admin__primary" type="submit">{busy ? "正在保存…" : form.status === "published" ? "保存并公开" : form.status === "unpublished" ? "保存并下架" : "保存为草稿"}</button></div>
      </fieldset></form>
    </div>
    {error && <p className="event-admin__error" role="alert">{error}</p>}{message && <p className="event-admin__success" role="status">{message}</p>}
  </AdminShell>;
}
