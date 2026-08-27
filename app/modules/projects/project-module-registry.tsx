import { lazy, type ComponentType, type LazyExoticComponent } from "react";
import type {
  ProjectLocale,
  ProjectModuleKey,
  PublicProjectIssue,
  PublicProjectSeries,
} from "./project-catalog";
import type { PublicPatternEntry } from "./archive-model/public-pattern-entry";
import type { ProjectView } from "./project-path";

export type { ProjectView } from "./project-path";

export interface ProjectModuleProps {
  archive: PublicPatternEntry[];
  locale: ProjectLocale;
  view: ProjectView;
  series: PublicProjectSeries;
  issue: PublicProjectIssue;
}

type ProjectComponent = ComponentType<ProjectModuleProps>;
// Native project modules are registered explicitly so a URL can never select an
// arbitrary import path. This also keeps project code out of the home bundle.
export const PROJECT_MODULES: Partial<
  Record<ProjectModuleKey, LazyExoticComponent<ProjectComponent>>
> = {
  "lanna-museum": lazy(() => import("./lanna-museum/LannaMuseumProject")),
};
