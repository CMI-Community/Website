import type { Route } from "./+types/project-en";
import {
  ProjectRouteView,
} from "../modules/projects/project-route";
import { loadProjectRoute } from "../modules/projects/project-route-loader.server";
import { projectRouteMeta } from "../modules/projects/project-meta";

export function loader(args: Route.LoaderArgs) {
  return loadProjectRoute("en", args);
}

export function meta({ loaderData }: Route.MetaArgs) {
  return projectRouteMeta(loaderData);
}

export default ProjectRouteView;
