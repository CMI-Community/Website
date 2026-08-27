import {
  isRouteErrorResponse,
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  useLocation,
} from "react-router";
import type { Route } from "./+types/root";
import "./app.css";

export const links: Route.LinksFunction = () => [
  { rel: "icon", href: "/favicon.svg", type: "image/svg+xml" },
  { rel: "preconnect", href: "https://fonts.googleapis.com" },
  { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
  {
    rel: "stylesheet",
    href: "https://fonts.googleapis.com/css2?family=Bodoni+Moda:opsz,ital,wght@6..96,0,400;6..96,0,600;6..96,1,400&family=DM+Mono:wght@300;400;500&family=Noto+Sans+SC:wght@300;400;500;600;700&family=Noto+Serif+SC:wght@400;500;600&display=swap",
  },
];

export function Layout({ children }: { children: React.ReactNode }) {
  const { pathname } = useLocation();
  const language = pathname.startsWith("/en/")
    ? "en"
    : pathname.startsWith("/th/")
      ? "th"
      : "zh-CN";
  return (
    <html lang={language}>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        <meta name="theme-color" content="#efefe9" />
        <Meta />
        <Links />
      </head>
      <body>
        {children}
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

export default function App() {
  return <Outlet />;
}

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  const notFound = isRouteErrorResponse(error) && error.status === 404;
  const title = notFound ? "这里还没有内容" : "页面暂时无法打开";
  const detail = notFound
    ? "你访问的页面不存在，或仍在筹备中。"
    : "服务遇到了意外情况。请稍后刷新；如果问题持续，可以在 GitHub 提交反馈。";
  return (
    <main className="system-state">
      <p className="system-state__eyebrow">CMI COMMUNITY</p>
      <h1>{title}</h1>
      <p>{detail}</p>
      <a href="/archive/posters">返回海报档案</a>
    </main>
  );
}
