import { Suspense } from "react";
import { redirect } from "react-router";
import {
  findProjectIssue,
  getProjectIssuePath,
  PROJECT_LOCALES,
  type ProjectLocale,
} from "./project-catalog";
import { PROJECT_MODULES, type ProjectView } from "./project-module-registry";

interface LoaderArgs {
  request: Request;
  params: Record<string, string | undefined>;
}

export interface ProjectRouteData {
  locale: ProjectLocale;
  view: ProjectView;
  series: NonNullable<ReturnType<typeof findProjectIssue>>["series"];
  issue: NonNullable<ReturnType<typeof findProjectIssue>>["issue"];
  moduleKey: "lanna-museum";
}

export function resolveProjectPath(splat: string | undefined) {
  const parts = (splat ?? "").split("/").filter(Boolean);
  if (parts.length !== 2 && !(parts.length === 3 && parts[2] === "recap")) {
    return null;
  }
  return {
    seriesSlug: parts[0],
    routeSegment: parts[1],
    view: (parts[2] === "recap" ? "recap" : "project") as ProjectView,
  };
}

export function loadProjectRoute(locale: ProjectLocale, { request, params }: LoaderArgs) {
  const resolved = resolveProjectPath(params["*"]);
  if (!resolved) throw new Response("Project not found", { status: 404 });

  const match = findProjectIssue(
    resolved.seriesSlug.toLowerCase(),
    resolved.routeSegment.toLowerCase(),
  );
  if (
    !match ||
    match.issue.publication.kind !== "native" ||
    !match.issue.locales.includes(locale)
  ) {
    throw new Response("Project not found", { status: 404 });
  }

  const url = new URL(request.url);
  const legacyLanguage = url.searchParams.get("lang");
  const targetLocale = locale === "zh-CN" && (legacyLanguage === "en" || legacyLanguage === "th")
    ? legacyLanguage
    : locale;
  const canonicalPath = getProjectIssuePath(
    match.series,
    match.issue,
    targetLocale,
    resolved.view,
  );
  if (legacyLanguage) url.searchParams.delete("lang");
  if (url.pathname !== canonicalPath || targetLocale !== locale || legacyLanguage) {
    url.pathname = canonicalPath;
    return redirect(`${url.pathname}${url.search}${url.hash}`, 308);
  }

  return {
    locale,
    view: resolved.view,
    series: match.series,
    issue: match.issue,
    moduleKey: match.issue.publication.moduleKey,
  } satisfies ProjectRouteData;
}

export function projectRouteMeta(data: ProjectRouteData | undefined) {
  if (!data) return [{ title: "CMI Community｜项目" }];
  const languageLabel = data.locale === "zh-CN" ? "" : data.locale === "en" ? " · EN" : " · TH";
  const viewLabel = data.view === "recap" ? " · 活动回顾" : "";
  const description = `${data.series.name}第 ${data.issue.number} 期：${data.issue.title}。`;
  const canonical = `https://cmi.community${getProjectIssuePath(
    data.series,
    data.issue,
    data.locale,
    data.view,
  )}`;
  const alternates = PROJECT_LOCALES.map((locale) => ({
    tagName: "link" as const,
    rel: "alternate",
    hrefLang: locale === "zh-CN" ? "zh-CN" : locale,
    href: `https://cmi.community${getProjectIssuePath(
      data.series,
      data.issue,
      locale,
      data.view,
    )}`,
  }));
  return [
    { title: `${data.issue.title}${viewLabel}${languageLabel}｜CMI Community` },
    { name: "description", content: description },
    { tagName: "link", rel: "canonical", href: canonical },
    { property: "og:title", content: `${data.issue.title}${viewLabel}` },
    { property: "og:description", content: description },
    { property: "og:url", content: canonical },
    ...alternates,
    {
      tagName: "link" as const,
      rel: "alternate",
      hrefLang: "x-default",
      href: `https://cmi.community${getProjectIssuePath(
        data.series,
        data.issue,
        "zh-CN",
        data.view,
      )}`,
    },
  ];
}

export function ProjectRouteView({ loaderData }: { loaderData: ProjectRouteData }) {
  const ProjectModule = PROJECT_MODULES[loaderData.moduleKey];
  if (!ProjectModule) throw new Error(`Project module is not registered: ${loaderData.moduleKey}`);
  return (
    <Suspense fallback={<main className="system-state"><p>项目正在打开…</p></main>}>
      <ProjectModule
        locale={loaderData.locale}
        view={loaderData.view}
        series={loaderData.series}
        issue={loaderData.issue}
      />
    </Suspense>
  );
}
