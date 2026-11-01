import { index, route, type RouteConfig } from "@react-router/dev/routes";

export default [
  index("routes/home.tsx"),
  route("admin/login", "routes/admin-login.tsx"),
  route("admin/events", "routes/admin-events.tsx"),
  route("admin/events/:id", "routes/admin-event-edit.tsx"),
  route("admin/api-keys", "routes/admin-api-keys.tsx"),
  route("events/:id", "routes/event-detail.tsx"),
  route("archive/posters", "routes/poster-archive.tsx"),
  route("project/*", "routes/project-zh.tsx"),
  route("en/project/*", "routes/project-en.tsx"),
  route("th/project/*", "routes/project-th.tsx"),
  route("en/*", "routes/english-placeholder.tsx"),
  route("privacy", "routes/privacy.tsx"),
] satisfies RouteConfig;
