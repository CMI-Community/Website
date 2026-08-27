import { describe, expect, it } from "vitest";
import type { PublicPatternEntry } from "../app/modules/projects/archive-model/public-pattern-entry";
import { toLannaPatternViewModel } from "../app/modules/projects/lanna-museum/archive/public-pattern-adapter";

const entry: PublicPatternEntry = {
  archiveNumber: "CMI-LN-0045",
  museumId: "fam",
  title: "织物纹样",
  location: "一层展厅",
  observation: "现场观察",
  verifiedInformation: "展签信息",
  openQuestion: "仍待了解",
  tags: { carrier: ["织物"], position: [], structure: ["重复"], material: ["丝"] },
  collectorName: "匿名采集者",
  capturedAt: "2026-07-26T08:00:00.000Z",
  publishedAt: "2026-07-26T09:00:00.000Z",
  media: [
    { role: "context", order: 0, src: "/media/context.webp", alt: "完整载体" },
    { role: "detail", order: 1, src: "/media/detail-2.webp", alt: "细节二" },
    { role: "detail", order: 0, src: "/media/detail-1.webp", alt: "细节一" },
    { role: "label", order: 0, src: "/media/label.webp", alt: "展签" },
  ],
};

describe("Lanna public archive adapter", () => {
  it("preserves role order while exposing only the project view model", () => {
    const result = toLannaPatternViewModel(entry);
    expect(result.detail_image_urls).toEqual(["/media/detail-1.webp", "/media/detail-2.webp"]);
    expect(result.context_image_urls).toEqual(["/media/context.webp"]);
    expect(result.label_image_urls).toEqual(["/media/label.webp"]);
    expect(result).not.toHaveProperty("sourceId");
    expect(result).not.toHaveProperty("objectKey");
  });
});
