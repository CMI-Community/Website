import type { Route } from "./+types/project-zh";
import {
  ProjectRouteView,
} from "../modules/projects/project-route";
import { loadProjectRoute } from "../modules/projects/project-route-loader.server";
import { projectRouteMeta } from "../modules/projects/project-meta";

export function loader(args: Route.LoaderArgs) {
  return loadProjectRoute("zh-CN", args);
}

export function meta({ loaderData }: Route.MetaArgs) {
  return projectRouteMeta(loaderData);
}

export default ProjectRouteView;
