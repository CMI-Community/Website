import { Suspense } from "react";
import type { PublicPatternEntry } from "./archive-model/public-pattern-entry";
import {
  findProjectIssue,
  type ProjectLocale,
} from "./project-catalog";
import { PROJECT_MODULES, type ProjectView } from "./project-module-registry";

export interface ProjectRouteData {
  archive: PublicPatternEntry[];
  locale: ProjectLocale;
  view: ProjectView;
  series: NonNullable<ReturnType<typeof findProjectIssue>>["series"];
  issue: NonNullable<ReturnType<typeof findProjectIssue>>["issue"];
  moduleKey: "lanna-museum";
}

export function ProjectRouteView({ loaderData }: { loaderData: ProjectRouteData }) {
  const ProjectModule = PROJECT_MODULES[loaderData.moduleKey];
  if (!ProjectModule) throw new Error(`Project module is not registered: ${loaderData.moduleKey}`);
  return (
    <Suspense fallback={<main className="system-state"><p>项目正在打开…</p></main>}>
      <ProjectModule
        archive={loaderData.archive}
        locale={loaderData.locale}
        view={loaderData.view}
        series={loaderData.series}
        issue={loaderData.issue}
      />
    </Suspense>
  );
}
