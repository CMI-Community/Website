import { describe, expect, it } from "vitest";
import { sanitizeCatalog } from "../scripts/poster-catalog.mjs";
import { orderPosters, posterSortTime } from "../app/modules/poster-wall/poster-ordering";

describe("poster time ordering", () => {
  it("orders by event time ahead of publication time in both directions, keeping unknown dates last", () => {
    const posters = [
      { id: "past", eventTime: "2025.01.01 · 周三 · 18:00–20:00 · 清迈时间", publishedAt: "2026-11-01" },
      { id: "unknown", eventTime: "日期待补", publishedAt: "" },
      { id: "future", eventTime: "2027年1月1日 14:00–16:00", publishedAt: "2024-01-01" },
      { id: "legacy", eventTime: "仅记载年份：2026", publishedAt: "2026-01-01" },
    ];
    expect(orderPosters(posters).map(p => p.id)).toEqual(["future", "legacy", "past", "unknown"]);
    expect(orderPosters(posters, "date-asc").map(p => p.id)).toEqual(["past", "legacy", "future", "unknown"]);
    expect(posters[0].id).toBe("past");
  });

  it("respects times within a day and normalizes publication time zones", () => {
    const posters = [
      { id: "morning", eventTime: "2026.11.18 · 周三 · 10:00–12:00 · 清迈时间" },
      { id: "evening", eventTime: "2026.11.18 · 周三 · 18:00–20:00 · 清迈时间" },
    ];
    expect(orderPosters(posters).map(p => p.id)).toEqual(["evening", "morning"]);
    expect(posterSortTime({ publishedAt: "2026-11-18 10:00:00" }))
      .toBe(posterSortTime({ publishedAt: "2026-11-18T03:00:00Z" }));
    expect(posterSortTime({ publishedAt: "2026-11-18T10:00:00+07:00" }))
      .toBe(posterSortTime(posters[0]));
  });

  it("does not promote backfill placeholders, partial years or invalid calendar dates to event dates", () => {
    for (const eventTime of ["2026.07.10（补录日期）", "2026年", "2026.02.30 · 10:00", "2026.11.18 · 25:00"]) {
      expect(posterSortTime({ eventTime, publishedAt: "2025-01-02" }))
        .toBe(Date.parse("2025-01-02T00:00:00+07:00"));
    }
    expect(posterSortTime({ publishedAt: "", publishedDate: "2025-06-01" }))
      .toBe(Date.parse("2025-06-01T00:00:00+07:00"));
  });
});

describe("public poster catalog", () => {
  it("keeps only display fields", () => {
    const catalog = sanitizeCatalog([
      {
        id: "poster.png",
        imagePath: "poster.webp",
        width: 1080,
        height: 1440,
        title: "社区活动",
        publishedAt: "2026-08-01 12:00:00",
        publishedDate: "2026-08-01",
        eventTime: { value: "2026 年 8 月", status: "OBSERVED", evidence: "内部" },
        initiator: { value: "CMI Community", status: "VERIFIED" },
        summary: "公开摘要",
        articleUrl: "https://example.com/article",
        series: { name: "系列", issue: 1, status: "INFERRED" },
        category: "活动",
        sourceLocalPath: "/private/archive/poster.png",
        imageSha256: "secret-hash",
        provenance: { sourceStatus: "VERIFIED" },
        rights: { permissionStatus: "UNKNOWN" },
      },
    ]);

    expect(catalog.count).toBe(1);
    expect(catalog.posters[0]).toEqual({
      id: "poster.png",
      imagePath: "poster.webp",
      width: 1080,
      height: 1440,
      title: "社区活动",
      publishedAt: "2026-08-01 12:00:00",
      publishedDate: "2026-08-01",
      eventTime: "2026 年 8 月",
      initiator: "CMI Community",
      summary: "公开摘要",
      articleUrl: "https://example.com/article",
      series: { name: "系列", issue: 1 },
      category: "活动",
    });
    expect(JSON.stringify(catalog)).not.toMatch(/sourceLocalPath|Sha256|provenance|permissionStatus|evidence/);
  });

  it("rejects local paths masquerading as image names", () => {
    expect(() =>
      sanitizeCatalog([{ id: "poster.png", imagePath: "../private/poster.webp" }]),
    ).toThrow();
  });
});
