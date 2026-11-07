import { useEffect, useRef, useState, type FormEvent } from "react";
import { data } from "react-router";
import type { Route } from "./+types/admin-event-edit";
import { cloudflareContext } from "../shared/cloudflare-context";
import { getEvent } from "../modules/activities/event-repository.server";
import {
  requireAdminPage,
  privateHeaders,
} from "../modules/activities/admin.server";
import { AdminShell } from "../modules/activities/AdminShell";
import { EventAutofill } from "../modules/activities/EventAutofill";
import { mergeAutofill } from "../modules/activities/event-autofill";
import {
  adminApi,
  adminEnvironmentLabel,
  AdminApiError,
  bangkokInput,
  errorMessage,
} from "../modules/activities/admin-client";
import type {
  EventInput,
  EventRecord,
} from "../modules/activities/event-schema";
export const headers = privateHeaders;
export function meta() {
  return [{ title: "编辑活动｜CMI Community" }];
}
export async function loader({ request, context, params }: Route.LoaderArgs) {
  const { env, ctx } = context.get(cloudflareContext);
  await requireAdminPage(request, env, ctx);
  const environment = env.APP_ENV;
  if (!params.id || params.id === "new") return { event: null, environment };
  const event = await getEvent(env.DB, params.id);
  if (!event) throw data("活动不存在", { status: 404 });
  return { event, environment };
}
const empty: EventInput = {
  title: "",
  startsAt: null,
  endsAt: null,
  location: "",
  category: "",
  summary: "",
  posterMediaId: "",
  posterAlt: null,
  detailUrl: null,
  registrationUrl: null,
  initiator: "CMI Community",
  series: null,
  sourcePublishedAt: null,
  status: "draft",
};
function inputOf(e: EventRecord | null): EventInput {
  if (!e) return empty;
  return {
    title: e.title,
    startsAt: e.startsAt,
    endsAt: e.endsAt,
    location: e.location,
    category: e.category,
    summary: e.summary,
    posterMediaId: e.posterMediaId,
    posterAlt: e.posterAlt,
    detailUrl: e.detailUrl,
    registrationUrl: e.registrationUrl,
    initiator: e.initiator,
    series: e.series,
    sourcePublishedAt: e.sourcePublishedAt,
    status: e.status,
  };
}
export default function AdminEventEdit({ loaderData }: Route.ComponentProps) {
  const siteLabel = adminEnvironmentLabel[loaderData.environment];
  const [publishedUrl, setPublishedUrl] = useState<string | null>(null);
  const [event, setEvent] = useState<EventRecord | null>(loaderData.event);
  const [form, setForm] = useState<EventInput>(() => inputOf(loaderData.event));
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [fields, setFields] = useState<Record<string, string>>({});
  const [preview, setPreview] = useState(false);
  const [confirmUnpublish, setConfirmUnpublish] = useState(false);
  const [pendingBackup, setPendingBackup] = useState(false);
  const previewRef = useRef<HTMLElement>(null);
  useEffect(() => {
    if (!preview) return;
    const previous = document.activeElement as HTMLElement | null;
    const oldOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    previewRef.current?.querySelector<HTMLButtonElement>("button")?.focus();
    const keydown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setPreview(false);
        return;
      }
      if (e.key !== "Tab") return;
      const controls = [
        ...(previewRef.current?.querySelectorAll<HTMLElement>(
          "button,a[href]",
        ) ?? []),
      ];
      const first = controls[0],
        last = controls.at(-1);
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last?.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first?.focus();
      }
    };
    document.addEventListener("keydown", keydown);
    return () => {
      document.body.style.overflow = oldOverflow;
      document.removeEventListener("keydown", keydown);
      previous?.focus();
    };
  }, [preview]);
  const [revisions, setRevisions] = useState<
    { version: number; event: EventRecord; createdAt: string }[]
  >([]);
  const [restoreVersion, setRestoreVersion] = useState("");
  useEffect(() => {
    if (event)
      adminApi<{
        revisions: { version: number; event: EventRecord; createdAt: string }[];
      }>(`/api/v1/admin/events/${encodeURIComponent(event.id)}/revisions`)
        .then((result) => setRevisions(result.revisions))
        .catch(() => {});
  }, [event]);
  async function restore() {
    if (!event || !restoreVersion) return;
    setBusy(true);
    setError("");
    try {
      const result = await adminApi<{ event: EventRecord }>(
        `/api/v1/admin/events/${encodeURIComponent(event.id)}/restore`,
        {
          method: "POST",
          headers: { "If-Match": `"v${event.version}"` },
          body: JSON.stringify({ revisionNumber: Number(restoreVersion) }),
        },
      );
      setEvent(result.event);
      setForm(inputOf(result.event));
      setMessage("历史内容已恢复为新草稿，请核对后发布。");
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  const backfill =
    event?.timePrecision === "backfill_placeholder" &&
    !form.startsAt &&
    !form.endsAt;
  function set<K extends keyof EventInput>(key: K, value: EventInput[K]) {
    setForm((old) => ({ ...old, [key]: value }));
    setMessage("");
  }
  const fieldError = (key: string) =>
    fields[key] ? (
      <small className="event-admin__error">{fields[key]}</small>
    ) : null;
  async function upload(file: File | undefined) {
    if (!file) return null;
    setBusy(true);
    setError("");
    try {
      const body = new FormData();
      body.append("file", file);
      const result = await adminApi<{ media: { id: string } }>(
        "/api/v1/admin/media",
        { method: "POST", body },
      );
      set("posterMediaId", result.media.id);
      setMessage("海报上传完成。");
      return result.media.id;
    } catch (e) {
      setError(errorMessage(e));
      return null;
    } finally {
      setBusy(false);
    }
  }
  async function save(status: EventInput["status"]) {
    setBusy(true);
    setError("");
    setFields({});
    setMessage("");
    setPublishedUrl(null);
    try {
      const result = await adminApi<{ event: EventRecord }>(
        event
          ? `/api/v1/admin/events/${encodeURIComponent(event.id)}`
          : "/api/v1/admin/events",
        {
          method: event ? "PUT" : "POST",
          headers: event ? { "If-Match": `"v${event.version}"` } : {},
          body: JSON.stringify({ ...form, status }),
        },
      );
      setEvent(result.event);
      setForm(inputOf(result.event));
      const saved = result.event;
      const eventPath = `/events/${encodeURIComponent(saved.id)}`;
      if (!event) window.history.replaceState(null, "", `/admin${eventPath}`);
      if (saved.status !== "published") {
        setMessage("活动已保存。");
        return;
      }
      try {
        const options: RequestInit = {
          credentials: "omit",
          cache: "no-store",
          signal: AbortSignal.timeout(8_000),
        };
        const [detail, poster] = await Promise.all([
          fetch(`/api/v1${eventPath}`, options),
          fetch(saved.poster.url, { ...options, method: "HEAD" }),
        ]);
        if (!detail.ok || !poster.ok || !poster.headers.get("content-type")?.startsWith("image/"))
          throw new Error("Public activity or poster unavailable");
        const { event: publicEvent } = (await detail.json()) as { event: EventRecord };
        if (publicEvent.id !== saved.id || publicEvent.version !== saved.version || publicEvent.poster.url !== saved.poster.url)
          throw new Error("Public revision does not match saved revision");
        setPublishedUrl(eventPath);
        setMessage(`活动已发布，${siteLabel}的公开详情和海报已核验。`);
      } catch {
        setError(`活动已保存，暂时无法核验${siteLabel}的公开详情或海报。请稍后打开活动详情确认。`);
      }
    } catch (e) {
      setError(errorMessage(e));
      if (e instanceof AdminApiError) setFields(e.fields);
    } finally {
      setBusy(false);
    }
  }
  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const action = (e.nativeEvent as SubmitEvent).submitter?.getAttribute(
      "value",
    );
    if (action === "preview") {
      setPreview(true);
      return;
    }
    void save(
      action === "published"
        ? "published"
        : form.status === "published"
          ? "published"
          : "draft",
    );
  }
  async function unpublish(retry = false) {
    if (!event) return;
    setBusy(true);
    setError("");
    setMessage("");
    setPublishedUrl(null);
    try {
      const result = await adminApi<{ event: EventRecord }>(
        `/api/v1/admin/events/${encodeURIComponent(event.id)}${retry ? "/retry-unpublish" : ""}`,
        {
          method: retry ? "POST" : "PATCH",
          headers: { "If-Match": `"v${event.version}"` },
          body: JSON.stringify(retry ? {} : { status: "unpublished" }),
        },
      );
      if (result.event) {
        setEvent(result.event);
        setForm(inputOf(result.event));
      }
      setPendingBackup(false);
      setMessage("活动已下架，独立恢复记录已保存。");
      setConfirmUnpublish(false);
    } catch (e) {
      if (e instanceof AdminApiError && e.code === "BACKUP_PENDING") {
        setPendingBackup(true);
        const next = e.details.event as EventRecord | undefined;
        if (next) {
          setEvent(next);
          setForm(inputOf(next));
        }
      }
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <AdminShell title={event ? "编辑活动" : "新增活动"} environment={loaderData.environment}>
      <a href="/admin/events">← 返回活动列表</a>
      <p className="event-admin__note">
        时间统一按清迈时间（UTC+7）填写。带 * 的项目必填。
      </p>
      {event && (
        <p>
          当前状态：
          {event.status === "published"
            ? "已发布"
            : event.status === "unpublished"
              ? "已下架"
              : "草稿"}{" "}
          · 版本 {event.version}
        </p>
      )}
      <EventAutofill
        busy={busy}
        onWorking={setBusy}
        posterMediaId={form.posterMediaId}
        upload={upload}
        apply={(result, overwrite) => {
          const merged = mergeAutofill(
            form,
            result.fields,
            overwrite,
            event?.timePrecision === "backfill_placeholder",
          );
          setForm(merged.form);
          setFields({});
          setError("");
          setMessage("");
          return merged;
        }}
      />
      <form
        id="event-manual-fields"
        className="event-admin__form"
        onSubmit={submit}
      >
        <fieldset disabled={busy}>
          <legend>活动信息</legend>
          <label>
            活动标题 *
            <input
              required
              maxLength={160}
              value={form.title}
              onChange={(e) => set("title", e.target.value)}
            />
            {fieldError("title")}
          </label>
          {backfill ? (
            <div className="event-admin__notice">
              2026.07.10（补录日期） ·
              该时间为后期补录。原始时间已保留在迁移记录中。
            </div>
          ) : (
            <div className="event-admin__columns">
              <label>
                开始时间 *
                <input
                  type="datetime-local"
                  required
                  value={bangkokInput(form.startsAt)}
                  onChange={(e) =>
                    set(
                      "startsAt",
                      e.target.value ? `${e.target.value}:00+07:00` : null,
                    )
                  }
                />
                {fieldError("startsAt")}
              </label>
              <label>
                结束时间 *
                <input
                  type="datetime-local"
                  required
                  value={bangkokInput(form.endsAt)}
                  onChange={(e) =>
                    set(
                      "endsAt",
                      e.target.value ? `${e.target.value}:00+07:00` : null,
                    )
                  }
                />
                {fieldError("endsAt")}
              </label>
            </div>
          )}
          <div className="event-admin__columns">
            <label>
              活动地点{!event ? " *" : ""}
              <input
                required={!event}
                maxLength={240}
                value={form.location}
                onChange={(e) => set("location", e.target.value)}
              />
              {fieldError("location")}
            </label>
            <label>
              分类 *
              <input
                required
                maxLength={80}
                value={form.category}
                onChange={(e) => set("category", e.target.value)}
                list="event-categories"
              />
            </label>
            <datalist id="event-categories">
              <option>CMI TALK</option>
              <option>分享交流</option>
              <option>AI 共创活动</option>
              <option>好好吃饭</option>
            </datalist>
          </div>
          <label>
            简介 *
            <textarea
              aria-describedby="event-summary-count"
              rows={5}
              required
              maxLength={500}
              value={form.summary}
              onChange={(e) => set("summary", e.target.value)}
            />
            {fieldError("summary")}
          </label>
          <small id="event-summary-count">{form.summary.length} / 500</small>
          <label>
            上传海报 *
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={(e) => void upload(e.target.files?.[0])}
            />
            <small>JPG、PNG 或 WebP，最大 10 MB。</small>
            {fieldError("posterMediaId")}
          </label>
          {form.posterMediaId && (
            <img
              className="event-admin__poster"
              src={`/api/v1/admin/media/${encodeURIComponent(form.posterMediaId)}`}
              alt="已上传的活动海报"
            />
          )}
          <label>
            海报文字说明
            <input
              maxLength={300}
              value={form.posterAlt ?? ""}
              placeholder="留空使用活动标题"
              onChange={(e) => set("posterAlt", e.target.value || null)}
            />
          </label>
          <div className="event-admin__columns">
            <label>
              原文／详情外链
              <input
                type="url"
                pattern="https://.*"
                value={form.detailUrl ?? ""}
                placeholder="https://"
                onChange={(e) => set("detailUrl", e.target.value || null)}
              />
            </label>
            <label>
              报名链接
              <input
                type="url"
                pattern="https://.*"
                value={form.registrationUrl ?? ""}
                placeholder="https://"
                onChange={(e) => set("registrationUrl", e.target.value || null)}
              />
            </label>
          </div>
          <details>
            <summary>更多信息</summary>
            <label>
              发起／组织
              <input
                required
                maxLength={160}
                value={form.initiator}
                onChange={(e) => set("initiator", e.target.value)}
              />
            </label>
            <div className="event-admin__columns">
              <label>
                系列名称
                <input
                  maxLength={100}
                  value={form.series?.name ?? ""}
                  onChange={(e) =>
                    set(
                      "series",
                      e.target.value
                        ? {
                            name: e.target.value,
                            issue: form.series?.issue ?? null,
                          }
                        : null,
                    )
                  }
                />
              </label>
              <label>
                期数
                <input
                  type="number"
                  min={1}
                  step={1}
                  disabled={!form.series}
                  value={form.series?.issue ?? ""}
                  onChange={(e) =>
                    form.series &&
                    set("series", {
                      ...form.series,
                      issue: e.target.value ? Number(e.target.value) : null,
                    })
                  }
                />
              </label>
            </div>
            <label>
              来源发布时间
              <input
                value={form.sourcePublishedAt ?? ""}
                placeholder="原文发布时间（选填）"
                onChange={(e) =>
                  set("sourcePublishedAt", e.target.value || null)
                }
              />
              <small>与活动时间、网站发布时间分开保存。</small>
            </label>
          </details>
        </fieldset>
        {error && (
          <div className="event-admin__error" role="alert">
            {error}
            {error.includes("版本") && (
              <p>请重新打开活动核对最新内容，再合并你的修改。</p>
            )}
          </div>
        )}
        {message && (
          <p className="event-admin__success" role="status">
            {message}{" "}
            {publishedUrl && event?.status === "published" && (
              <a href={publishedUrl} target="_blank" rel="noreferrer">
                打开公开活动详情 ↗
              </a>
            )}
          </p>
        )}
        {(pendingBackup || event?.status === "unpublished") && (
          <button
            type="button"
            disabled={busy}
            onClick={() => void unpublish(true)}
          >
            核验／重试下架恢复记录
          </button>
        )}
        <div className="event-admin__actions">
          <button type="submit" value="preview" disabled={busy}>
            预览
          </button>
          <button
            type="submit"
            value="draft"
            disabled={busy || !form.posterMediaId}
          >
            {busy
              ? "处理中…"
              : form.status === "published"
                ? "保存已公开修改"
                : "保存草稿"}
          </button>
          <button
            className="event-admin__primary"
            type="submit"
            value="published"
            disabled={busy || !form.posterMediaId}
          >
            {form.status === "published" ? "保存并公开" : "发布活动"}
          </button>
          {event?.status === "published" && (
            <button
              type="button"
              className="event-admin__danger"
              disabled={busy}
              onClick={() => setConfirmUnpublish(true)}
            >
              下架活动
            </button>
          )}
        </div>
      </form>
      {confirmUnpublish && (
        <section className="event-admin__notice" role="alert">
          <h2>确认下架这场活动？</h2>
          <p>活动与海报将从公开列表、档案和详情页撤下，原资料仍保留。</p>
          <div className="event-admin__actions">
            <button
              type="button"
              disabled={busy}
              onClick={() => void unpublish()}
            >
              确认下架
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => setConfirmUnpublish(false)}
            >
              取消
            </button>
          </div>
        </section>
      )}
      {event && (
        <details className="event-admin__panel">
          <summary>历史修订 · 恢复为新草稿</summary>
          <p>
            恢复会保留当前版本，生成新的草稿，不会自动公开。已发布活动请先下架。
          </p>
          <label>
            选择历史版本
            <select
              value={restoreVersion}
              onChange={(e) => setRestoreVersion(e.target.value)}
            >
              <option value="">请选择</option>
              {revisions.map((revision) => (
                <option key={revision.version} value={revision.version}>
                  版本 {revision.version} · {revision.event.title}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            disabled={busy || !restoreVersion || event.status === "published"}
            onClick={() => void restore()}
          >
            恢复所选版本为草稿
          </button>
        </details>
      )}
      {preview && (
        <div className="event-admin__overlay">
          <section
            ref={previewRef}
            role="dialog"
            aria-modal="true"
            aria-label="活动预览"
            className="event-admin__preview"
          >
            <button autoFocus type="button" onClick={() => setPreview(false)}>
              关闭预览 ×
            </button>
            <p className="event-admin__eyebrow">预览 · 尚未保存</p>
            <h2>{form.title}</h2>
            <p>
              {backfill
                ? "2026.07.10（补录日期）"
                : `${bangkokInput(form.startsAt).replace("T", " ")} — ${bangkokInput(form.endsAt).replace("T", " ")} · 清迈时间`}
            </p>
            {form.location && <p>{form.location}</p>}
            <p>{form.summary}</p>
            {form.posterMediaId && (
              <img
                className="event-admin__poster"
                src={`/api/v1/admin/media/${encodeURIComponent(form.posterMediaId)}`}
                alt={form.posterAlt ?? form.title}
              />
            )}
            <p>{form.initiator}</p>
            {form.detailUrl && (
              <a href={form.detailUrl} target="_blank" rel="noreferrer">
                查看原文 ↗
              </a>
            )}
            {form.registrationUrl && (
              <a href={form.registrationUrl} target="_blank" rel="noreferrer">
                报名 ↗
              </a>
            )}
          </section>
        </div>
      )}
    </AdminShell>
  );
}
