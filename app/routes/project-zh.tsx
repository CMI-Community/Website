import type { Route } from "./+types/project-zh";
import {
  loadProjectRoute,
  ProjectRouteView,
  projectRouteMeta,
} from "../modules/projects/project-route";

export function loader(args: Route.LoaderArgs) {
  return loadProjectRoute("zh-CN", args);
}

export function meta({ loaderData }: Route.MetaArgs) {
  return projectRouteMeta(loaderData);
}

export default ProjectRouteView;
