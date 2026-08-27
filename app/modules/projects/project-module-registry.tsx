import { type ComponentType, type LazyExoticComponent } from "react";
import type {
  ProjectLocale,
  ProjectModuleKey,
  PublicProjectIssue,
  PublicProjectSeries,
} from "./project-catalog";

export type ProjectView = "project" | "recap";

export interface ProjectModuleProps {
  locale: ProjectLocale;
  view: ProjectView;
  series: PublicProjectSeries;
  issue: PublicProjectIssue;
}

type ProjectComponent = ComponentType<ProjectModuleProps>;
// Native project modules are registered explicitly so a URL can never select an
// arbitrary import path. The Lanna module is added by the migration PR.
export const PROJECT_MODULES: Partial<
  Record<ProjectModuleKey, LazyExoticComponent<ProjectComponent>>
> = {};
