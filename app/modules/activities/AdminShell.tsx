import type { ReactNode } from "react";
import { adminApi, adminEnvironmentLabel } from "./admin-client";
import "./admin.css";
export function AdminShell({
  title,
  environment,
  children,
}: {
  title: string;
  environment: CloudflareEnv["APP_ENV"];
  children: ReactNode;
}) {
  return (
    <main className="event-admin">
      <header className="event-admin__header">
        <a href="/admin/events" className="event-admin__brand">
          CMI <span>活动后台</span>
        </a>
        <nav aria-label="管理导航">
          <a href="/admin/events">活动</a>
          <a href="/admin/api-keys">API 授权</a>
          <a href="/" target="_blank" rel="noreferrer">
            查看{adminEnvironmentLabel[environment]} ↗
          </a>
          <button
            type="button"
            onClick={async () => {
              await adminApi("/api/auth/sign-out", {
                method: "POST",
                body: "{}",
              });
              window.location.assign("/admin/login");
            }}
          >
            退出
          </button>
        </nav>
      </header>
      <p className="event-admin__eyebrow">{adminEnvironmentLabel[environment]}</p>
      <h1>{title}</h1>
      {children}
    </main>
  );
}
