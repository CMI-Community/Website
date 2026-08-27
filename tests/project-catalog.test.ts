import { describe, expect, it } from "vitest";
import {
  findProjectIssue,
  formatProjectDate,
  getProjectIssueHref,
  getProjectIssuePath,
  orderProjectIssues,
  PROJECT_LOCALES,
  PROJECT_SERIES,
} from "../app/modules/projects/project-catalog";

describe("public project series catalog", () => {
  it("uses unique non-empty series and issue identifiers", () => {
    const seriesIds = PROJECT_SERIES.map((series) => series.id);
    const issueIds = PROJECT_SERIES.flatMap((series) => series.issues.map((issue) => issue.id));

    expect(new Set(seriesIds).size).toBe(seriesIds.length);
    expect(new Set(issueIds).size).toBe(issueIds.length);
    for (const series of PROJECT_SERIES) {
      expect(series.id.trim()).not.toBe("");
      expect(series.slug).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
      expect(series.name.trim()).not.toBe("");
      expect(series.credit.trim()).not.toBe("");
      expect(series.issues.length).toBeGreaterThan(0);
      for (const issue of series.issues) {
        expect(issue.id.trim()).not.toBe("");
        expect(issue.slug).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
        expect(issue.routeSegment).toBe(`${issue.number}-${issue.slug}`);
        expect(issue.title.trim()).not.toBe("");
        expect(issue.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
        expect(Number.isNaN(Date.parse(`${issue.date}T00:00:00Z`))).toBe(false);
        expect(issue.locales).toEqual(PROJECT_LOCALES);
      }
    }
  });

  it("keeps issues newest-first and limits destinations to HTTPS", () => {
    for (const series of PROJECT_SERIES) {
      const catalogDates = series.issues.map((issue) => issue.date);
      const ordered = orderProjectIssues(series.issues);
      expect(catalogDates).toEqual([...catalogDates].sort().reverse());
      expect(ordered.map((issue) => issue.date)).toEqual(catalogDates);
      for (const issue of ordered) {
        expect(issue.number).toBeGreaterThan(0);
        const href = getProjectIssueHref(series, issue);
        if (issue.publication.kind === "external") {
          expect(new URL(href).protocol).toBe("https:");
        } else {
          expect(href.startsWith("/project/")).toBe(true);
        }
      }
    }
  });

  it("contains the approved WaytoAGI Chiang Mai entry", () => {
    expect(PROJECT_SERIES[0]).toMatchObject({
      name: "WaytoAGI 切磋大会 · 清迈场",
      credit: "WaytoAGI 发起 · CMI Community 组织清迈场",
      issues: [
        {
          number: 26,
          slug: "lanna-museum",
          routeSegment: "26-lanna-museum",
          title: "博物馆奇妙日",
          date: "2026-07-26",
          publication: {
            kind: "native",
            moduleKey: "lanna-museum",
          },
        },
      ],
    });
    expect(formatProjectDate(PROJECT_SERIES[0].issues[0].date)).toBe("2026.07.26");
  });

  it("derives canonical language and recap paths from the approved route segment", () => {
    const series = PROJECT_SERIES[0];
    const issue = series.issues[0];

    expect(getProjectIssuePath(series, issue)).toBe(
      "/project/waytoagi/26-lanna-museum",
    );
    expect(getProjectIssuePath(series, issue, "en")).toBe(
      "/en/project/waytoagi/26-lanna-museum",
    );
    expect(getProjectIssuePath(series, issue, "th", "recap")).toBe(
      "/th/project/waytoagi/26-lanna-museum/recap",
    );
    expect(findProjectIssue("waytoagi", "26-lanna-museum")).toEqual({
      series,
      issue,
    });
    expect(findProjectIssue("waytoagi", "99-missing")).toBeNull();
  });
});
