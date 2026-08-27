import { index, route, type RouteConfig } from "@react-router/dev/routes";

export default [
  index("routes/home.tsx"),
  route("archive/posters", "routes/poster-archive.tsx"),
  route("project/*", "routes/project-zh.tsx"),
  route("en/project/*", "routes/project-en.tsx"),
  route("th/project/*", "routes/project-th.tsx"),
  route("en/*", "routes/english-placeholder.tsx"),
  route("privacy", "routes/privacy.tsx"),
] satisfies RouteConfig;
