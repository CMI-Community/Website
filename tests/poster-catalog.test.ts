import { describe, expect, it } from "vitest";
import { sanitizeCatalog } from "../scripts/poster-catalog.mjs";

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
