import { useRef, useState, type FormEvent } from "react";
import type { Route } from "./+types/admin-photos";
import { cloudflareContext } from "../shared/cloudflare-context";
import { requireAdminPage, privateHeaders } from "../modules/activities/admin.server";
import { AdminShell } from "../modules/activities/AdminShell";
import { adminApi, errorMessage } from "../modules/activities/admin-client";
import { listEvents } from "../modules/activities/event-repository.server";
import { getEventSeriesMemberships, listPhotos, listSeries } from "../modules/community-content/content-repository.server";
import type { CommunityPhoto, PhotoInput } from "../modules/community-content/content-schema";
import { adminPhotoPreview, contentStatusLabels, matchesContentQuery, uploadContentImage } from "../modules/community-content/content-client";
import "../modules/community-content/content.css";

export const headers = privateHeaders;
export function meta() { return [{ title: "照片管理｜CMI Community" }]; }
export async function loader({ request, context }: Route.LoaderArgs) {
  const { env, ctx } = context.get(cloudflareContext);
  await requireAdminPage(request, env, ctx);
  const [photos, series, events, memberships] = await Promise.all([
    listPhotos(env.DB), listSeries(env.DB), listEvents(env.DB), getEventSeriesMemberships(env.DB),
  ]);
  return { photos, series, events, memberships, environment: env.APP_ENV };
}
type PhotoForm = Omit<PhotoInput, "mediaId"> & { mediaId: string | null };
const emptyPhoto: PhotoForm = { mediaId: null, alt: "", status: "draft", seriesId: null, eventId: null, sortOrder: 0 };
function photoForm(photo: CommunityPhoto): PhotoForm {
  const { mediaId, alt, status, seriesId, eventId, sortOrder } = photo;
  return { mediaId, alt, status, seriesId, eventId, sortOrder };
}

export default function AdminPhotos({ loaderData }: Route.ComponentProps) {
  const [photos, setPhotos] = useState(loaderData.photos);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [seriesFilter, setSeriesFilter] = useState("all");
  const [editing, setEditing] = useState<CommunityPhoto | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState<PhotoForm>(emptyPhoto);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const formRef = useRef<HTMLElement>(null);
  const seriesName = (id: string | null) => loaderData.series.find(item => item.id === id)?.name ?? "未归属栏目";
  const eventName = (id: string | null) => loaderData.events.find(item => item.id === id)?.title ?? "";
  const visible = photos.filter(photo => (status === "all" || photo.status === status)
    && (seriesFilter === "all" || (seriesFilter === "none" ? !photo.seriesId : photo.seriesId === seriesFilter))
    && matchesContentQuery(query, [photo.alt, photo.id, seriesName(photo.seriesId), eventName(photo.eventId)]));
  function open(photo: CommunityPhoto | null) {
    setEditing(photo); setForm(photo ? photoForm(photo) : { ...emptyPhoto });
    setFormOpen(true); setError(""); setMessage("");
    requestAnimationFrame(() => {
      formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      formRef.current?.querySelector<HTMLElement>("input,textarea")?.focus({ preventScroll: true });
    });
  }
  async function upload(file?: File) {
    if (!file) return;
    setBusy(true); setError(""); setMessage("");
    try {
      const media = await uploadContentImage(file);
      setForm(current => ({ ...current, mediaId: media.id }));
      setMessage("照片上传完成。填写说明后，保存草稿或发布。");
    } catch (failure) { setError(errorMessage(failure)); }
    finally { setBusy(false); }
  }
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editing && !form.mediaId) { setError("请先上传一张照片。"); return; }
    setBusy(true); setError(""); setMessage("");
    try {
      const { mediaId, ...metadata } = form;
      const result = await adminApi<{ photo: CommunityPhoto }>(
        `/api/v1/admin/photos${editing ? `/${encodeURIComponent(editing.id)}` : ""}`,
        { method: editing ? "PATCH" : "POST",
          headers: editing ? { "If-Match": `"v${editing.version}"` } : undefined,
          body: JSON.stringify(editing ? metadata : { ...metadata, mediaId }) },
      );
      setPhotos(current => [result.photo, ...current.filter(photo => photo.id !== result.photo.id)]
        .sort((a, b) => a.sortOrder - b.sortOrder || b.createdAt.localeCompare(a.createdAt)));
      setEditing(result.photo); setForm(photoForm(result.photo));
      setMessage(`照片已保存 · ${contentStatusLabels[result.photo.status]}`);
    } catch (failure) { setError(errorMessage(failure)); }
    finally { setBusy(false); }
  }
  async function importLegacy() {
    setBusy(true); setError(""); setMessage("");
    try {
      const result = await adminApi<{ imported: number; total: number }>("/api/v1/admin/photos/import-legacy", { method: "POST", body: "{}" });
      const refreshed = await adminApi<{ photos: CommunityPhoto[] }>("/api/v1/admin/photos");
      setPhotos(refreshed.photos);
      setMessage(`已导入 ${result.imported} 张历史照片；目录共有 ${result.total} 张。`);
    } catch (failure) { setError(errorMessage(failure)); }
    finally { setBusy(false); }
  }

  return <AdminShell title="照片管理" environment={loaderData.environment}>
    <div className="event-admin__toolbar"><p>浏览全部照片，按栏目和活动整理社区影像。</p><button className="event-admin__primary" type="button" disabled={busy} onClick={() => open(null)}>上传新照片 ＋</button></div>
    <div className="event-admin__filters">
      <label>查找照片<input type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder="照片说明、栏目或活动名称" /></label>
      <label>照片状态<select value={status} onChange={event => setStatus(event.target.value)}><option value="all">全部状态</option>{Object.entries(contentStatusLabels).map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></label>
      <label>筛选栏目<select value={seriesFilter} onChange={event => setSeriesFilter(event.target.value)}><option value="all">全部栏目</option><option value="none">未归属栏目</option>{loaderData.series.map(item => <option value={item.id} key={item.id}>{item.name}</option>)}</select></label>
    </div>
    <p className="event-admin__note" aria-live="polite">显示 {visible.length} / {photos.length} 张照片 · 图片按需加载</p>
    {visible.length ? <div className="content-grid content-grid--photos">
      {visible.map(photo => <article className="content-card" key={photo.id}>
        <button className="content-card__image-button" type="button" disabled={busy} onClick={() => open(photo)} aria-label={`编辑照片：${photo.alt}`}><img src={adminPhotoPreview(photo)} alt={photo.alt} width={photo.width} height={photo.height} loading="lazy" decoding="async" /></button>
        <div className="content-card__body"><span className={`event-admin__badge event-admin__badge--${photo.status}`}>{contentStatusLabels[photo.status]}</span><h2>{photo.alt}</h2><p>{seriesName(photo.seriesId)}</p>{photo.eventId && <p className="content-card__summary">{eventName(photo.eventId)}</p>}<p className="event-admin__note">{photo.width} × {photo.height}{!photo.mediaId && " · 历史照片"}</p><button type="button" disabled={busy} onClick={() => open(photo)}>编辑照片</button></div>
      </article>)}
    </div> : <section className="event-admin__panel"><h2>没有符合条件的照片</h2><p>{photos.length ? "调整筛选条件，或上传新照片。" : "上传新照片，或把官网原有照片导入管理目录。"}</p></section>}
    <details className="event-admin__panel"><summary>官网历史照片</summary><p>将当前照片墙的历史照片加入管理目录，之后可修改说明、归属栏目和显示状态。重复导入会保留已有修改。</p><button type="button" disabled={busy} onClick={() => void importLegacy()}>{busy ? "正在处理…" : "导入官网已有照片"}</button><p className="event-admin__note">历史照片原文件保留；从官网下架不会清除此前公开文件的外部缓存。</p></details>
    {formOpen && <section className="event-admin__panel content-editor" ref={formRef} aria-labelledby="photo-editor-title">
      <div className="content-editor__heading"><h2 id="photo-editor-title">{editing ? "编辑照片" : "上传新照片"}</h2><button type="button" disabled={busy} onClick={() => setFormOpen(false)}>收起编辑</button></div>
      <form onSubmit={save}><fieldset disabled={busy}>
        {!editing && <label>选择照片 *<input aria-label="选择照片 *" aria-describedby="photo-upload-help" type="file" accept="image/jpeg,image/png,image/webp" onChange={event => void upload(event.target.files?.[0])} /><small id="photo-upload-help">JPG、PNG 或 WebP，最大 10 MB。</small></label>}
        {(form.mediaId || editing) && <img className="content-editor__photo" src={form.mediaId ? `/api/v1/admin/media/${encodeURIComponent(form.mediaId)}` : adminPhotoPreview(editing!, true)} alt={form.alt || "待保存照片预览"} />}
        <label>照片说明 *<textarea aria-label="照片说明 *" aria-describedby="photo-alt-help" rows={3} required maxLength={300} value={form.alt} onChange={event => setForm({ ...form, alt: event.target.value })} /><small id="photo-alt-help">用一句话介绍画面，也供使用读屏的访客理解照片。</small></label>
        <div className="event-admin__columns">
          <label>关联活动<select aria-label="关联活动" aria-describedby="photo-event-help" value={form.eventId ?? ""} onChange={event => { const id = event.target.value || null; setForm({ ...form, eventId: id, seriesId: id ? loaderData.memberships.find(item => item.eventId === id)?.seriesId ?? null : form.seriesId }); }}><option value="">不关联具体活动</option>{loaderData.events.map(item => <option value={item.id} key={item.id}>{item.eventDate} · {item.title}</option>)}</select><small id="photo-event-help">选择活动会带入它的栏目，你可以继续调整。</small></label>
          <label>所属栏目<select aria-label="所属栏目" value={form.seriesId ?? ""} onChange={event => setForm({ ...form, seriesId: event.target.value || null })}><option value="">未归属栏目</option>{loaderData.series.map(item => <option value={item.id} key={item.id}>{item.name}{item.status !== "published" ? `（${contentStatusLabels[item.status]}）` : ""}</option>)}</select></label>
        </div>
        <div className="event-admin__columns"><label>发布状态<select aria-label="发布状态" value={form.status} onChange={event => setForm({ ...form, status: event.target.value as PhotoForm["status"] })}>{Object.entries(contentStatusLabels).map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></label><label>显示顺序<input type="number" min={0} max={1000000} step={1} required value={form.sortOrder} onChange={event => setForm({ ...form, sortOrder: Number(event.target.value) })} /><small>数字越小，排列越靠前。</small></label></div>
        {form.status === "published" && form.eventId && loaderData.events.find(item => item.id === form.eventId)?.status !== "published" && <p className="event-admin__notice">照片已关联尚未公开的活动；活动公开后，这张照片才会出现在公开浏览中。</p>}
        {form.status === "unpublished" && <p className="event-admin__notice">保存后，照片会从官网的公开列表中隐藏，原资料仍保留。</p>}
        <div className="event-admin__actions"><button className="event-admin__primary" type="submit" disabled={!editing && !form.mediaId}>{busy ? "处理中…" : form.status === "published" ? "保存并发布照片" : form.status === "unpublished" ? "保存并下架照片" : "保存照片草稿"}</button></div>
      </fieldset></form>
    </section>}
    {error && <p className="event-admin__error" role="alert">{error}</p>}
    {message && <p className="event-admin__success" role="status">{message}</p>}
  </AdminShell>;
}
