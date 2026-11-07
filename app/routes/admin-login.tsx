import { useEffect, useState, type FormEvent } from "react";
import type { Route } from "./+types/admin-login";
import { cloudflareContext } from "../shared/cloudflare-context";
import { adminApi, adminEnvironmentLabel, errorMessage } from "../modules/activities/admin-client";
import "../modules/activities/admin.css";
export const headers = () => ({
  "Cache-Control": "no-store",
  "X-Robots-Tag": "noindex, nofollow",
});
export function meta() {
  return [{ title: "管理员登录｜CMI Community" }];
}
export function loader({ context }: Route.LoaderArgs) {
  return { environment: context.get(cloudflareContext).env.APP_ENV };
}
export default function AdminLogin({ loaderData }: Route.ComponentProps) {
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [seconds, setSeconds] = useState(0);
  useEffect(() => {
    if (!seconds) return;
    const timer = window.setTimeout(() => setSeconds(seconds - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [seconds]);
  async function send() {
    setBusy(true);
    setError("");
    try {
      await adminApi("/api/auth/email-otp/send-verification-otp", {
        method: "POST",
        body: JSON.stringify({ email, type: "sign-in" }),
      });
      setSent(true);
      setSeconds(60);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!sent) return send();
    setBusy(true);
    setError("");
    try {
      await adminApi("/api/auth/sign-in/email-otp", {
        method: "POST",
        body: JSON.stringify({ email, otp }),
      });
      window.location.assign("/admin/events");
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className="event-admin event-admin--login">
      <a className="event-admin__brand" href="/">
        CMI <span>Community</span>
      </a>
      <section className="event-admin__panel">
        <p className="event-admin__eyebrow">{adminEnvironmentLabel[loaderData.environment]} · 活动管理</p>
        <h1>管理员登录</h1>
        <p>使用已授权的邮箱接收验证码。</p>
        <form onSubmit={submit}>
          <label>
            邮箱
            <input
              type="email"
              autoComplete="email"
              required
              value={email}
              readOnly={sent}
              onChange={(e) => setEmail(e.target.value)}
            />
          </label>
          {sent && (
            <>
              <p role="status">验证码已发送，5 分钟内有效。</p>
              <label>
                6 位验证码
                <input
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  pattern="[0-9]{6}"
                  maxLength={6}
                  required
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                />
              </label>
            </>
          )}
          {error && (
            <p className="event-admin__error" role="alert">
              {error}
            </p>
          )}
          <button className="event-admin__primary" disabled={busy}>
            {busy ? "正在处理…" : sent ? "验证并登录" : "发送验证码"}
          </button>
          {sent && (
            <div className="event-admin__actions">
              <button
                type="button"
                disabled={busy || seconds > 0}
                onClick={send}
              >
                {seconds ? `${seconds} 秒后可重发` : "重新发送"}
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => {
                  setSent(false);
                  setOtp("");
                }}
              >
                更换邮箱
              </button>
            </div>
          )}
        </form>
      </section>
    </main>
  );
}
