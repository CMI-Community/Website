export interface PublicProjectIssue {
  id: string;
  number: number;
  title: string;
  date: string;
  href: string;
}

export interface PublicProjectSeries {
  id: string;
  name: string;
  credit: string;
  issues: readonly PublicProjectIssue[];
}

export const PROJECT_SERIES = [
  {
    id: "waytoagi-skills-exchange-chiang-mai",
    name: "WaytoAGI 切磋大会 · 清迈场",
    credit: "WaytoAGI 发起 · CMI Community 组织清迈场",
    issues: [
      {
        id: "waytoagi-skills-exchange-chiang-mai-26",
        number: 26,
        title: "博物馆奇妙日",
        date: "2026-07-26",
        href: "https://lanna-museum-day-chiang-mai.vercel.app/",
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
