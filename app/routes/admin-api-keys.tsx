import { useEffect, useState, type FormEvent } from "react";
import type { Route } from "./+types/admin-api-keys";
import { cloudflareContext } from "../shared/cloudflare-context";
import {
  requireAdminPage,
  privateHeaders,
} from "../modules/activities/admin.server";
import { AdminShell } from "../modules/activities/AdminShell";
import {
  adminApi,
  errorMessage,
  AdminApiError,
} from "../modules/activities/admin-client";
export const headers = privateHeaders;
export function meta() {
  return [{ title: "API 授权｜CMI Community" }];
}
export async function loader({ request, context }: Route.LoaderArgs) {
  const { env, ctx } = context.get(cloudflareContext);
  await requireAdminPage(request, env, ctx);
  return {};
}
interface ApiKey {
  id: string;
  name: string;
  source: string;
  permissions: string[];
  scope: { type: string; eventIds?: string[] };
  expiresAt: string;
  revokedAt: string | null;
  createdAt: string;
}
const permissions = [
  ["events:read", "读取活动"],
  ["events:write", "新建、修改草稿"],
  ["events:publish", "发布及修改已公开活动"],
  ["events:unpublish", "下架活动"],
  ["media:write", "上传海报"],
] as const;
export default function AdminApiKeys() {
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [name, setName] = useState("");
  const [source, setSource] = useState("activity-center");
  const [days, setDays] = useState(7);
  const [selected, setSelected] = useState(["events:write", "media:write"]);
  const [scopeType, setScopeType] = useState("source");
  const [eventIds, setEventIds] = useState("");
  const [token, setToken] = useState("");
  const [message, setMessage] = useState("");
  const [recentOtp, setRecentOtp] = useState(false);
  const [revokeId, setRevokeId] = useState("");
  const [referenceTime] = useState(() => Date.now());
  async function load() {
    try {
      const result = await adminApi<{ keys: ApiKey[] }>(
        "/api/v1/admin/api-keys",
      );
      setKeys(result.keys);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    let active = true;
    adminApi<{ keys: ApiKey[] }>("/api/v1/admin/api-keys")
      .then(
        (result) => {
          if (active) setKeys(result.keys);
        },
        (e) => {
          if (active) setError(errorMessage(e));
        },
      )
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);
  async function issue(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    setToken("");
    setMessage("");
    setRecentOtp(false);
    try {
      const result = await adminApi<{ token: string }>(
        "/api/v1/admin/api-keys",
        {
          method: "POST",
          body: JSON.stringify({
            name,
            source,
            expiresInDays: days,
            permissions: selected,
            scope:
              scopeType === "source"
                ? { type: "source" }
                : {
                    type: "events",
                    eventIds: eventIds.split(/[\s,，]+/).filter(Boolean),
                  },
          }),
        },
      );
      setToken(result.token);
      setMessage("密钥已签发。请立即复制，下次无法再次显示。");
      await load();
    } catch (e) {
      setError(errorMessage(e));
      if (e instanceof AdminApiError && e.code === "RECENT_OTP_REQUIRED")
        setRecentOtp(true);
    } finally {
      setBusy(false);
    }
  }
  async function revoke() {
    setBusy(true);
    setError("");
    try {
      await adminApi(
        `/api/v1/admin/api-keys/${encodeURIComponent(revokeId)}/revoke`,
        { method: "POST", body: "{}" },
      );
      setMessage("密钥已撤销。");
      setRevokeId("");
      await load();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <AdminShell title="API 授权">
      <p>给活动中心或 Agent 签发独立密钥，并限定它能操作的活动。</p>
      <form className="event-admin__form" onSubmit={issue}>
        <fieldset disabled={busy}>
          <legend>签发密钥</legend>
          <div className="event-admin__columns">
            <label>
              名称 *
              <input
                required
                maxLength={80}
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="如：活动中心同步"
              />
            </label>
            <label>
              来源 *
              <input
                required
                pattern="[a-z0-9][a-z0-9-]*"
                maxLength={80}
                value={source}
                onChange={(e) => setSource(e.target.value)}
              />
              <small>使用小写字母、数字和连字符，须与接口路径一致。</small>
            </label>
          </div>
          <label>
            有效期（天）
            <input
              type="number"
              min={1}
              max={90}
              required
              value={days}
              onChange={(e) => setDays(Number(e.target.value))}
            />
          </label>
          <fieldset className="event-admin__permissions">
            <legend>允许的操作</legend>
            {permissions.map(([value, label]) => (
              <label key={value}>
                <input
                  type="checkbox"
                  checked={selected.includes(value)}
                  onChange={(e) =>
                    setSelected((old) =>
                      e.target.checked
                        ? [...old, value]
                        : old.filter((item) => item !== value),
                    )
                  }
                />
                {label}
              </label>
            ))}
          </fieldset>
          <label>
            活动范围
            <select
              value={scopeType}
              onChange={(e) => setScopeType(e.target.value)}
            >
              <option value="source">此来源的活动（可新增）</option>
              <option value="events">指定活动 ID（不能新增）</option>
            </select>
          </label>
          {scopeType === "events" && (
            <label>
              允许的活动 ID *
              <textarea
                required
                rows={3}
                value={eventIds}
                onChange={(e) => setEventIds(e.target.value)}
                placeholder="每行一个活动 ID"
              />
            </label>
          )}
          <p className="event-admin__note">
            默认仅能编辑草稿、上传海报，7
            天后过期。发布权限允许直接公开活动；只有草稿权限不能修改已发布内容。
          </p>
          <button
            className="event-admin__primary"
            disabled={busy || !selected.length}
          >
            {busy ? "处理中…" : "签发密钥"}
          </button>
        </fieldset>
      </form>
      {error && (
        <p className="event-admin__error" role="alert">
          {error}
        </p>
      )}
      {recentOtp && <a href="/admin/login">重新用验证码登录后签发 →</a>}
      {message && (
        <p role="status" className="event-admin__success">
          {message}
        </p>
      )}
      {token && (
        <section className="event-admin__notice">
          <h2>密钥只显示这一次</h2>
          <p>只交给受信任的服务端，保存在它的密钥设置中。</p>
          <textarea aria-label="新签发的密钥" readOnly value={token} />
          <div className="event-admin__actions">
            <button
              type="button"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(token);
                  setMessage("密钥已复制。");
                } catch {
                  setMessage("请选中密钥手动复制。");
                }
              }}
            >
              复制密钥
            </button>
            <button type="button" onClick={() => setToken("")}>
              已保存，隐藏密钥
            </button>
          </div>
        </section>
      )}
      <h2>已签发的授权</h2>
      {loading ? (
        <p role="status">正在读取授权…</p>
      ) : keys.length ? (
        <div className="event-admin__list">
          {keys.map((key) => (
            <article key={key.id}>
              <div>
                <span className="event-admin__badge">
                  {key.revokedAt
                    ? "已撤销"
                    : Date.parse(key.expiresAt) <= referenceTime
                      ? "已过期"
                      : "有效"}
                </span>
                <h3>{key.name}</h3>
                <p>
                  来源：{key.source} · 到期：
                  {new Date(key.expiresAt).toLocaleString("zh-CN", {
                    timeZone: "Asia/Bangkok",
                  })}
                  （清迈时间）
                </p>
                <p>
                  {key.permissions
                    .map(
                      (value) =>
                        permissions.find((item) => item[0] === value)?.[1] ??
                        value,
                    )
                    .join("、")}
                </p>
                <p>
                  {key.scope.type === "source"
                    ? "范围：此来源的活动"
                    : `范围：${key.scope.eventIds?.join("、") ?? ""}`}
                </p>
              </div>
              {!key.revokedAt && (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => setRevokeId(key.id)}
                >
                  撤销
                </button>
              )}
            </article>
          ))}
        </div>
      ) : (
        <p>还没有签发 API 密钥。</p>
      )}
      {revokeId && (
        <section className="event-admin__notice" role="alert">
          <h2>撤销这枚密钥？</h2>
          <p>撤销后立即拒绝该密钥的新请求和旧请求重放。</p>
          <div className="event-admin__actions">
            <button type="button" disabled={busy} onClick={() => void revoke()}>
              确认撤销
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => setRevokeId("")}
            >
              取消
            </button>
          </div>
        </section>
      )}
    </AdminShell>
  );
}
