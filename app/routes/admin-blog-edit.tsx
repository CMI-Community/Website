import { useRef, useState } from "react";
import { data, useNavigate } from "react-router";
import type { Route } from "./+types/admin-blog-edit";
import { AdminShell } from "../modules/activities/AdminShell";
import { privateHeaders, requireAdminPage } from "../modules/activities/admin.server";
import { adminApi, errorMessage } from "../modules/activities/admin-client";
import { blogAdminApi, blogVersion } from "../modules/blog/blog-admin-client";
import { BlogEditor, type BlogEditorActions } from "../modules/blog/BlogEditor";
import { BlogBody } from "../modules/blog/BlogBody";
import { BlogAssociationPicker } from "../modules/blog/BlogAssociationPicker";
import type { ImportedBlogBody } from "../modules/blog/blog-html";
import { getBlogPost, loadAdminBlogOptions, type BlogOptions } from "../modules/blog/blog-repository.server";
import { blogPostPath, newBlogDraft, type BlogDraft, type BlogPost } from "../modules/blog/blog-schema";
import { weChatBlogImportEnabled } from "../../workers/blog-wechat";
import { cloudflareContext } from "../shared/cloudflare-context";
import "../modules/blog/blog.css";
import "../modules/blog/blog-admin.css";

export const headers = privateHeaders;
export const meta = () => [{ title: "编辑博客文章｜CMI 社区后台" }];

export async function loader({ request, context, params }: Route.LoaderArgs) {
  const { env, ctx } = context.get(cloudflareContext);
  await requireAdminPage(request, env, ctx);
  const [post, options] = await Promise.all([params.id === "new" ? null : getBlogPost(env.DB, params.id), loadAdminBlogOptions(env)]);
  if (params.id !== "new" && !post) throw data("文章不存在。", { status: 404 });
  return { post, options, environment: env.APP_ENV, importEnabled: weChatBlogImportEnabled(env), emptyDraft: newBlogDraft() };
}

type ImportResponse = { existingId: string } | (ImportedBlogBody & { title: string; summary: string; sourceUrl: string; displayDate: string });
const labelStatus = (status: string) => status === "published" ? "" : status === "draft" ? " · 草稿" : " · 已下架";
function toggle<T>(values: T[], value: T) { return values.includes(value) ? values.filter(item => item !== value) : [...values, value]; }

function BlogEditForm({ initial, emptyDraft, options, importEnabled }: {
  initial: BlogPost | null; emptyDraft: BlogDraft; options: BlogOptions; importEnabled: boolean;
}) {
  const navigate = useNavigate();
  const editor = useRef<BlogEditorActions>(null);
  const [post, setPost] = useState(initial);
  const [draft, setDraft] = useState(initial?.draft ?? emptyDraft);
  const [preview, setPreview] = useState(false);
  const [pending, setPending] = useState(0);
  const [operation, setOperation] = useState("");
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [importFeedback, setImportFeedback] = useState<{ message: string; failed: boolean } | null>(null);
  const [confirmUnpublish, setConfirmUnpublish] = useState(false);
  const [duplicate, setDuplicate] = useState("");
  const busy = Boolean(operation || pending);
  const eventKeys = draft.events.map(event => event.kind + ":" + event.id);
  const inherited = new Set(options.events.flatMap(event => event.status === "published" && event.seriesId && eventKeys.includes(event.kind + ":" + event.id) ? [event.seriesId] : []));

  function update<K extends keyof BlogDraft>(field: K, value: BlogDraft[K]) {
    setDraft(current => ({ ...current, [field]: value }));
  }

  async function persist(action: "save" | "publish" | "unpublish") {
    if (busy) return;
    setError("");
    setStatus("");
    setOperation(action);
    let saved = post;
    try {
      if (action !== "unpublish") {
        const response = await adminApi<{ post: BlogPost }>(blogAdminApi + "/posts" + (post ? "/" + post.id : ""), {
          method: post ? "PUT" : "POST",
          headers: post ? blogVersion(post.version) : undefined,
          body: JSON.stringify(draft),
        });
        saved = response.post;
        setPost(saved);
      }
      if (!saved) return;
      if (action !== "save") {
        const response = await adminApi<{ post: BlogPost }>(blogAdminApi + "/posts/" + saved.id + "/" + action, {
          method: "POST", headers: blogVersion(saved.version),
        });
        saved = response.post;
        setPost(saved);
      }
      setConfirmUnpublish(false);
      setStatus(action === "save" ? "草稿已保存。" : action === "publish" ? "已发布到 Blog。" : "文章已下架。");
      if (!initial) void navigate("/admin/blog/" + saved.id, { replace: true });
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setOperation("");
    }
  }

  async function importWeChat() {
    if (busy || !draft.sourceUrl) return;
    setOperation("import");
    setStatus("");
    setError("");
    setImportFeedback(null);
    setDuplicate("");
    try {
      const result = await adminApi<ImportResponse>(blogAdminApi + "/wechat", { method: "POST", body: JSON.stringify({ url: draft.sourceUrl }) });
      if ("existingId" in result) {
        setDuplicate(result.existingId);
        return;
      }
      const missed = await editor.current!.insertImported(result);
      setDraft(current => ({
        ...current, sourceUrl: result.sourceUrl, title: current.title || result.title,
        summary: current.summary || result.summary,
        displayDate: !post && current.displayDate === emptyDraft.displayDate && /^\d{4}-\d{2}-\d{2}$/.test(result.displayDate) ? result.displayDate : current.displayDate,
      }));
      setImportFeedback({ message: missed ? `正文已导入，${missed} 张图片待补传。` : "图文已导入，请核对后保存。", failed: false });
    } catch (cause) {
      setImportFeedback({ message: errorMessage(cause), failed: true });
    } finally {
      setOperation("");
    }
  }

  return <>
    <nav className="blog-admin-actions" aria-label="文章操作">
      <a href="/admin/blog">← 博客文章</a>
      <button type="button" disabled={busy} onClick={() => setPreview(value => !value)}>{preview ? "返回编辑" : "预览文章"}</button>
      <button type="button" disabled={busy} onClick={() => void persist("save")}>保存草稿</button>
      <button type="button" className="event-admin__primary" disabled={busy} onClick={() => void persist("publish")}>{post?.revisionId ? "更新公开版本" : "发布文章"}</button>
      {post?.revisionId && <>
        <a href={blogPostPath(post.slug)} target="_blank" rel="noreferrer">查看公开版本 ↗</a>
        <button type="button" disabled={busy} onClick={() => setConfirmUnpublish(value => !value)}>下架</button>
      </>}
    </nav>
    {confirmUnpublish && <div className="blog-admin-actions blog-admin-notice">
      <span>确认下架文章？草稿会继续保存在后台。</span>
      <button type="button" disabled={busy} onClick={() => void persist("unpublish")}>确认下架</button>
      <button type="button" onClick={() => setConfirmUnpublish(false)}>取消</button>
    </div>}
    {(status || (operation && operation !== "import") || pending > 0) && <p role="status" className="blog-admin-note">{pending > 0 ? `正在处理 ${pending} 张图片…` : operation ? "正在保存…" : status}</p>}
    {error && <p role="alert" className="blog-admin-error">{error}</p>}

    <div className="blog-edit-layout" hidden={preview}>
      <div className="blog-edit-main">
        <fieldset className="blog-edit-fields" disabled={Boolean(operation)}>
          <label>文章标题<input value={draft.title} maxLength={240} onChange={event => update("title", event.target.value)} /></label>
          <label>摘要（可选）<textarea value={draft.summary} maxLength={800} rows={2} onChange={event => update("summary", event.target.value)} /></label>
          <div className="blog-edit-metadata">
            <label>发布日期<input type="date" value={draft.displayDate} onChange={event => update("displayDate", event.target.value)} /></label>
            <label>原文语言<select value={draft.locale} onChange={event => update("locale", event.target.value === "en" ? "en" : "zh-CN")}>
              <option value="zh-CN">简体中文</option><option value="en">English</option>
            </select></label>
            <label>文章作者<select value={draft.authorId ?? ""} onChange={event => update("authorId", event.target.value || null)}>
              <option value="">选择作者</option>
              {options.authors.filter(author => author.active || author.id === draft.authorId).map(author =>
                <option key={author.id} value={author.id}>{author.displayName}{author.active ? "" : "（已停用）"}</option>)}
            </select></label>
          </div>
          <div className="blog-edit-source">
            <label>公众号原文网址（可选）<input type="url" value={draft.sourceUrl} maxLength={2048} onChange={event => update("sourceUrl", event.target.value)} /></label>
            {importEnabled && <button type="button" disabled={busy || !draft.sourceUrl} onClick={() => void importWeChat()}>导入公众号链接</button>}
          </div>
          {operation === "import" && <p role="status" className="blog-admin-note">正在读取公众号文章…</p>}
          {importFeedback && <p role={importFeedback.failed ? "alert" : "status"} className={importFeedback.failed ? "blog-admin-error" : "blog-admin-note"}>{importFeedback.message}</p>}
          {duplicate && <p role="status" className="blog-admin-note">这个链接已有文章。<a href={"/admin/blog/" + duplicate}>打开文章</a></p>}
        </fieldset>
        <h2>正文</h2>
        <p className="blog-admin-note">可在这里写作，也可直接粘贴公众号图文。</p>
        <BlogEditor ref={editor} initial={draft.body} photos={options.photos} sourceUrl={draft.sourceUrl} disabled={Boolean(operation) && operation !== "import"}
          onChange={value => update("body", value)} onPendingChange={delta => setPending(count => count + delta)} />
      </div>
      <aside className="blog-edit-relations" aria-label="关联内容">
        <h2>关联内容</h2>
        <p><a href="/admin/blog/authors" target="_blank" rel="noreferrer">管理作者 ↗</a></p>
        <fieldset disabled={Boolean(operation)}>
          <BlogAssociationPicker label="系列" items={options.series.map(series => ({ id: series.id, title: series.name, detail: labelStatus(series.status).trim() }))}
            selected={draft.seriesIds} onToggle={id => update("seriesIds", toggle(draft.seriesIds, id))} />
          <BlogAssociationPicker label="活动" items={options.events.map(event => ({
            id: event.kind + ":" + event.id, title: event.title,
            detail: [event.date, event.kind === "archive" ? "历史活动" : "活动"].filter(Boolean).join(" · ") + labelStatus(event.status),
          }))} selected={eventKeys} onToggle={key => {
            const match = options.events.find(event => event.kind + ":" + event.id === key);
            if (eventKeys.includes(key)) update("events", draft.events.filter(event => event.kind + ":" + event.id !== key));
            else if (match) update("events", [...draft.events, { kind: match.kind, id: match.id }]);
          }} />
          {!options.archiveAvailable && <small>历史活动暂时无法读取。</small>}
          {inherited.size > 0 && <p className="blog-admin-note">通过活动关联到 {options.series.filter(series => inherited.has(series.id) && series.status === "published").map(series => series.name).join("、") || "待公开系列"}</p>}
          <BlogAssociationPicker label="照片" items={options.photos.map(photo => ({ id: photo.id, title: photo.alt, thumbnail: photo.url + "?thumbnail=1", detail: labelStatus(photo.status).trim() }))}
            selected={draft.photoIds} onToggle={id => update("photoIds", toggle(draft.photoIds, id))} onInsert={id => editor.current?.insertPhoto(id)} />
          <small>勾选的照片显示在文末相册。「插入正文」把照片放到编辑器光标处。</small>
        </fieldset>
      </aside>
    </div>
    {preview && <article className="blog-admin-preview" lang={draft.locale} aria-label="文章预览">
      <p className="blog-byline"><time dateTime={draft.displayDate}>{draft.displayDate}</time><span>{options.authors.find(author => author.id === draft.authorId)?.displayName}</span></p>
      <h2>{draft.title || "未命名文章"}</h2>
      {draft.summary && <p>{draft.summary}</p>}
      <BlogBody body={draft.body} sourceUrl={draft.sourceUrl} locale={draft.locale} preview resolveImage={(kind, id) => {
        if (kind === "photo") return options.photos.find(photo => photo.id === id);
        if (kind === "upload") return { url: blogAdminApi + "/images/" + id, width: 0, height: 0 };
      }} />
    </article>}
  </>;
}

export default function AdminBlogEditor({ loaderData }: Route.ComponentProps) {
  return <AdminShell title={loaderData.post ? "编辑博客文章" : "新建博客文章"} environment={loaderData.environment}>
    <BlogEditForm key={loaderData.post?.id || "new"} initial={loaderData.post} {...loaderData} />
  </AdminShell>;
}
