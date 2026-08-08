import { index, route, type RouteConfig } from "@react-router/dev/routes";

export default [
  index("routes/home.tsx"),
  route("archive/posters", "routes/poster-archive.tsx"),
  route("en/*", "routes/english-placeholder.tsx"),
  route("privacy", "routes/privacy.tsx"),
] satisfies RouteConfig;
