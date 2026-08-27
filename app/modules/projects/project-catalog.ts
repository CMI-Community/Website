export const PROJECT_LOCALES = ["zh-CN", "en", "th"] as const;

export type ProjectLocale = (typeof PROJECT_LOCALES)[number];
export type ProjectModuleKey = "lanna-museum";

export type ProjectPublication =
  | { kind: "external"; href: `https://${string}` }
  | { kind: "native"; moduleKey: ProjectModuleKey };

export interface PublicProjectIssue {
  id: string;
  number: number;
  slug: string;
  routeSegment: `${number}-${string}`;
  title: string;
  date: string;
  locales: readonly ProjectLocale[];
  publication: ProjectPublication;
}

export interface PublicProjectSeries {
  id: string;
  slug: string;
  name: string;
  credit: string;
  issues: readonly PublicProjectIssue[];
}

export const PROJECT_SERIES = [
  {
    id: "waytoagi-skills-exchange-chiang-mai",
    slug: "waytoagi",
    name: "WaytoAGI 切磋大会 · 清迈场",
    credit: "WaytoAGI 发起 · CMI Community 组织清迈场",
    issues: [
      {
        id: "waytoagi-skills-exchange-chiang-mai-26",
        number: 26,
        slug: "lanna-museum",
        routeSegment: "26-lanna-museum",
        title: "博物馆奇妙日",
        date: "2026-07-26",
        locales: PROJECT_LOCALES,
        publication: {
          kind: "external",
          href: "https://lanna-museum-day-chiang-mai.vercel.app/",
        },
      },
    ],
  },
] as const satisfies readonly PublicProjectSeries[];

const PROJECT_DATE_FORMATTER = new Intl.DateTimeFormat("zh-CN", {
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  timeZone: "UTC",
});

export function orderProjectIssues(
  issues: readonly PublicProjectIssue[],
): PublicProjectIssue[] {
  return [...issues].sort((left, right) => right.date.localeCompare(left.date));
}

export function formatProjectDate(date: string): string {
  const parts = PROJECT_DATE_FORMATTER.formatToParts(new Date(`${date}T00:00:00Z`));
  const value = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? "";
  return [value("year"), value("month"), value("day")].join(".");
}

export function getProjectIssuePath(
  series: PublicProjectSeries,
  issue: PublicProjectIssue,
  locale: ProjectLocale = "zh-CN",
  view: "project" | "recap" = "project",
): string {
  const localePrefix = locale === "zh-CN" ? "" : `/${locale}`;
  const recapSuffix = view === "recap" ? "/recap" : "";
  return `${localePrefix}/project/${series.slug}/${issue.routeSegment}${recapSuffix}`;
}

export function getProjectIssueHref(
  series: PublicProjectSeries,
  issue: PublicProjectIssue,
): string {
  return issue.publication.kind === "external"
    ? issue.publication.href
    : getProjectIssuePath(series, issue);
}

export function isExternalProjectIssue(issue: PublicProjectIssue): boolean {
  return issue.publication.kind === "external";
}

export function findProjectIssue(seriesSlug: string, routeSegment: string) {
  const series = PROJECT_SERIES.find(
    (candidate) => candidate.slug === seriesSlug,
  ) as PublicProjectSeries | undefined;
  if (!series) return null;
  const issue = series.issues.find(
    (candidate) => candidate.routeSegment === routeSegment,
  ) as PublicProjectIssue | undefined;
  return issue ? { series, issue } : null;
}
