import { useRef, useState, type FormEvent } from "react";
import type { Route } from "./+types/admin-series";
import { cloudflareContext } from "../shared/cloudflare-context";
import { requireAdminPage, privateHeaders } from "../modules/activities/admin.server";
import { AdminShell } from "../modules/activities/AdminShell";
import { adminApi, errorMessage } from "../modules/activities/admin-client";
import { listSeries } from "../modules/community-content/content-repository.server";
import type { CommunitySeries, SeriesInput } from "../modules/community-content/content-schema";
import { contentStatusLabels, matchesContentQuery, uploadContentImage } from "../modules/community-content/content-client";
import "../modules/community-content/content.css";

export const headers = privateHeaders;
export function meta() { return [{ title: "系列栏目管理｜CMI Community" }]; }
export async function loader({ request, context }: Route.LoaderArgs) {
  const { env, ctx } = context.get(cloudflareContext);
  await requireAdminPage(request, env, ctx);
  return { series: await listSeries(env.DB), environment: env.APP_ENV };
}

const emptySeries: SeriesInput = {
  slug: "", name: "", description: "", logoMediaId: null, status: "draft", sortOrder: 0,
};
function seriesForm(series: CommunitySeries): SeriesInput {
  const { slug, name, description, logoMediaId, status, sortOrder } = series;
  return { slug, name, description, logoMediaId, status, sortOrder };
}

export default function AdminSeries({ loaderData }: Route.ComponentProps) {
  const [series, setSeries] = useState(loaderData.series);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const [editing, setEditing] = useState<CommunitySeries | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState<SeriesInput>(emptySeries);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const formRef = useRef<HTMLElement>(null);
  const visible = series.filter(item => (filter === "all" || item.status === filter)
    && matchesContentQuery(query, [item.name, item.slug, item.description]));
  function open(item: CommunitySeries | null) {
    setEditing(item);
    setForm(item ? seriesForm(item) : { ...emptySeries });
    setFormOpen(true);
    setError("");
    setMessage("");
    requestAnimationFrame(() => {
      formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      formRef.current?.querySelector<HTMLInputElement>("input")?.focus({ preventScroll: true });
    });
  }
  async function upload(file?: File) {
    if (!file) return;
    setBusy(true); setError(""); setMessage("");
    try {
      const media = await uploadContentImage(file);
      setForm(current => ({ ...current, logoMediaId: media.id }));
      setMessage("Logo 上传完成，保存栏目后生效。");
    } catch (failure) { setError(errorMessage(failure)); }
    finally { setBusy(false); }
  }
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true); setError(""); setMessage("");
    try {
      const result = await adminApi<{ series: CommunitySeries }>(
        `/api/v1/admin/series${editing ? `/${encodeURIComponent(editing.id)}` : ""}`,
        { method: editing ? "PATCH" : "POST",
          headers: editing ? { "If-Match": `"v${editing.version}"` } : undefined,
          body: JSON.stringify(form) },
      );
      setSeries(current => [...current.filter(item => item.id !== result.series.id), result.series]
        .sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name)));
      setEditing(result.series); setForm(seriesForm(result.series));
      setMessage(`栏目已保存 · ${contentStatusLabels[result.series.status]}`);
    } catch (failure) { setError(errorMessage(failure)); }
    finally { setBusy(false); }
  }

  return <AdminShell title="系列栏目" environment={loaderData.environment}>
    <div className="event-admin__toolbar">
      <p>按长期系列组织活动，每个栏目有自己的介绍、Logo 和照片。</p>
      <button className="event-admin__primary" type="button" disabled={busy} onClick={() => open(null)}>创建栏目 ＋</button>
    </div>
    <div className="event-admin__filters">
      <label>查找栏目<input type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder="名称、介绍或网址标识" /></label>
      <label>栏目状态<select value={filter} onChange={event => setFilter(event.target.value)}>
        <option value="all">全部状态</option>
        {Object.entries(contentStatusLabels).map(([value, label]) => <option value={value} key={value}>{label}</option>)}
      </select></label>
    </div>
    <p className="event-admin__note" aria-live="polite">显示 {visible.length} / {series.length} 个栏目</p>
    {visible.length ? <div className="content-grid content-grid--series">
      {visible.map(item => <article className="content-card" key={item.id}>
        <div className="content-card__body">
          {item.logoMediaId ? <img className="content-card__logo" src={`/api/v1/admin/media/${encodeURIComponent(item.logoMediaId)}`} alt={`${item.name} Logo`} loading="lazy" /> : <span className="content-card__logo content-card__logo--empty" aria-hidden="true">{item.name.slice(0, 1)}</span>}
          <span className={`event-admin__badge event-admin__badge--${item.status}`}>{contentStatusLabels[item.status]}</span>
          <h2>{item.name}</h2>
          <p className="content-card__summary">{item.description || "尚未填写介绍"}</p>
          <p className="event-admin__note">/series/{item.slug}</p>
          <div className="event-admin__actions">
            <button type="button" disabled={busy} onClick={() => open(item)} aria-label={`编辑栏目：${item.name}`}>编辑栏目</button>
            {item.status === "published" && <a href={`/series/${encodeURIComponent(item.slug)}`} target="_blank" rel="noreferrer">查看栏目 ↗</a>}
          </div>
        </div>
      </article>)}
    </div> : <section className="event-admin__panel"><h2>没有符合条件的栏目</h2><p>{series.length ? "调整搜索条件，或创建一个栏目。" : "先创建栏目，再把活动和照片归入其中。"}</p></section>}
    {formOpen && <section ref={formRef} className="event-admin__panel content-editor" aria-labelledby="series-editor-title">
      <div className="content-editor__heading"><h2 id="series-editor-title">{editing ? "编辑栏目" : "创建栏目"}</h2><button type="button" disabled={busy} onClick={() => setFormOpen(false)}>收起编辑</button></div>
      <form onSubmit={save}>
        <fieldset disabled={busy}>
          <div className="event-admin__columns">
            <label>栏目名称 *<input required maxLength={100} value={form.name} onChange={event => setForm({ ...form, name: event.target.value })} /></label>
            <label>栏目网址标识 *<input aria-label="栏目网址标识 *" aria-describedby="series-slug-help" required pattern={"[a-z0-9][a-z0-9\\-]{1,79}"} minLength={2} maxLength={80} value={form.slug} onChange={event => setForm({ ...form, slug: event.target.value })} placeholder="例如 cmi-talk" /><small id="series-slug-help">使用 2–80 位小写英文字母、数字或连字符。网址为 /series/{form.slug || "栏目标识"}。</small></label>
          </div>
          <label>栏目介绍<textarea rows={5} maxLength={2000} value={form.description} onChange={event => setForm({ ...form, description: event.target.value })} /></label>
          <label>上传栏目 Logo<input aria-label="上传栏目 Logo" aria-describedby="series-logo-help" type="file" accept="image/jpeg,image/png,image/webp" onChange={event => void upload(event.target.files?.[0])} /><small id="series-logo-help">JPG、PNG 或 WebP，最大 10 MB。</small></label>
          {form.logoMediaId && <div className="content-editor__logo"><img src={`/api/v1/admin/media/${encodeURIComponent(form.logoMediaId)}`} alt="栏目 Logo 预览" /><button type="button" onClick={() => setForm({ ...form, logoMediaId: null })}>移除 Logo</button></div>}
          <div className="event-admin__columns">
            <label>发布状态<select aria-label="发布状态" value={form.status} onChange={event => setForm({ ...form, status: event.target.value as SeriesInput["status"] })}>{Object.entries(contentStatusLabels).map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></label>
            <label>显示顺序<input type="number" min={0} max={1000000} step={1} required value={form.sortOrder} onChange={event => setForm({ ...form, sortOrder: Number(event.target.value) })} /><small>数字越小，排列越靠前。</small></label>
          </div>
          {form.status === "unpublished" && <p className="event-admin__notice">保存后，栏目页及 Logo 会隐藏；活动和照片的发布状态分别在对应管理页面调整。</p>}
          <div className="event-admin__actions"><button className="event-admin__primary" type="submit">{busy ? "处理中…" : form.status === "published" ? "保存并发布栏目" : form.status === "unpublished" ? "保存并下架栏目" : "保存栏目草稿"}</button><a href="/admin/events">管理栏目活动 →</a></div>
        </fieldset>
      </form>
    </section>}
    {error && <p className="event-admin__error" role="alert">{error}</p>}
    {message && <p className="event-admin__success" role="status">{message}</p>}
  </AdminShell>;
}
