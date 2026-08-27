import type { Route } from "./+types/project-th";
import {
  ProjectRouteView,
} from "../modules/projects/project-route";
import { loadProjectRoute } from "../modules/projects/project-route-loader.server";
import { projectRouteMeta } from "../modules/projects/project-meta";

export function loader(args: Route.LoaderArgs) {
  return loadProjectRoute("th", args);
}

export function meta({ loaderData }: Route.MetaArgs) {
  return projectRouteMeta(loaderData);
}

export default ProjectRouteView;
