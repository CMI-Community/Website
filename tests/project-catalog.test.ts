import { describe, expect, it } from "vitest";
import {
  formatProjectDate,
  orderProjectIssues,
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
      expect(series.name.trim()).not.toBe("");
      expect(series.credit.trim()).not.toBe("");
      expect(series.issues.length).toBeGreaterThan(0);
      for (const issue of series.issues) {
        expect(issue.id.trim()).not.toBe("");
        expect(issue.title.trim()).not.toBe("");
        expect(issue.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
        expect(Number.isNaN(Date.parse(`${issue.date}T00:00:00Z`))).toBe(false);
        expect(issue.href.trim()).not.toBe("");
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
        expect(new URL(issue.href).protocol).toBe("https:");
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
          title: "博物馆奇妙日",
          date: "2026-07-26",
          href: "https://lanna-museum-day-chiang-mai.vercel.app/",
        },
      ],
    });
    expect(formatProjectDate(PROJECT_SERIES[0].issues[0].date)).toBe("2026.07.26");
  });
});
