import type { ReactNode } from "react";
import { adminApi } from "./admin-client";
import "./admin.css";
export function AdminShell({
  title,
  children,
}: {
  title: string;
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
            查看官网 ↗
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
      <h1>{title}</h1>
      {children}
    </main>
  );
}
