import { redirect, type RouterContextProvider } from "react-router";
import { cloudflareContext } from "../../shared/cloudflare-context";
import { readPublicLannaArchive } from "./lanna-museum/pattern-archive/project-archive.server";
import {
  findProjectIssue,
  getProjectIssuePath,
  type ProjectLocale,
} from "./project-catalog";
import { resolveProjectPath } from "./project-path";
import type { ProjectRouteData } from "./project-route";

interface LoaderArgs {
  request: Request;
  params: Record<string, string | undefined>;
  context: Readonly<RouterContextProvider>;
}

export async function loadProjectRoute(
  locale: ProjectLocale,
  { context, request, params }: LoaderArgs,
) {
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

  const { env } = context.get(cloudflareContext);
  const archive = resolved.view === "project"
    ? await readPublicLannaArchive(env.DB)
    : [];

  return {
    archive,
    locale,
    view: resolved.view,
    series: match.series,
    issue: match.issue,
    moduleKey: match.issue.publication.moduleKey,
  } satisfies ProjectRouteData;
}
