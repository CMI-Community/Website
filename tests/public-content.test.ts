import { describe, expect, it } from "vitest";
import { publicContent } from "../app/modules/publishing/public-content";

describe("published content boundary", () => {
  it("does not expose author or permission internals", () => {
    const result = publicContent({
      id: "content-id",
      type: "story",
      locale: "zh-CN",
      slug: "hello",
      title: "你好",
      summary: null,
      body_md: "正文",
      metadata_json: '{"cover":"https://assets.example/cover.webp"}',
      status: "published",
      published_at: "2026-08-01T00:00:00Z",
      updated_at: "2026-08-01T00:00:00Z",
      created_by: "private-user-id",
      updated_by: "private-user-id",
      published_by: "admin-id",
    });
    expect(result).not.toHaveProperty("created_by");
    expect(result).not.toHaveProperty("published_by");
    expect(result).not.toHaveProperty("status");
  });
});
