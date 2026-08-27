import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { buildLannaArchiveImport } from "../scripts/lib/lanna-archive-import.mjs";

describe("Lanna archive import transformer", () => {
  it("creates deterministic D1 and R2 manifests without exposing source URLs in SQL", () => {
    const storageRoot = mkdtempSync(join(tmpdir(), "cmi-lanna-import-"));
    mkdirSync(join(storageRoot, "source", "detail"), { recursive: true });
    mkdirSync(join(storageRoot, "source", "context"), { recursive: true });
    writeFileSync(join(storageRoot, "source", "detail", "a.jpg"), "detail");
    writeFileSync(join(storageRoot, "source", "context", "b.png"), "context");

    const input = [{
      id: "source-1",
      archive_number: "CMI-LN-0045",
      museum: "fam",
      source_title: "纹样",
      source_location: "一层",
      observation: "观察",
      verified_information: "",
      open_question: "问题",
      carrier_tags: ["织物"],
      position_tags: [],
      structure_tags: ["重复"],
      material_tags: ["丝"],
      collector_name: "匿名采集者",
      status: "published",
      rights_review: true,
      detail_image_urls: ["https://example.supabase.co/storage/v1/object/public/pattern-submissions/source/detail/a.jpg"],
      context_image_urls: ["https://example.supabase.co/storage/v1/object/public/pattern-submissions/source/context/b.png"],
      label_image_urls: [],
      created_at: "2026-07-26T08:00:00Z",
      published_at: "2026-07-26T08:00:00Z",
    }];

    const first = buildLannaArchiveImport({
      input,
      storageRoot,
      createdBy: "admin-user",
      snapshotAt: "2026-08-27T12:00:00Z",
    });
    const second = buildLannaArchiveImport({
      input,
      storageRoot,
      createdBy: "admin-user",
      snapshotAt: "2026-08-27T12:00:00Z",
    });

    expect(first.manifest.manifestSha256).toBe(second.manifest.manifestSha256);
    expect(first.manifest).toMatchObject({ recordCount: 1, objectCount: 2, totalBytes: 13 });
    expect(first.manifest.media[0].objectKey).toMatch(
      /^projects\/waytoagi\/26-lanna-museum\/v1\/archive\/cmi-ln-0045\/detail\//,
    );
    expect(first.sql).toContain("ON CONFLICT");
    expect(first.sql).not.toContain("example.supabase.co");
    expect(first.sql).not.toContain(storageRoot);
  });

  it("rejects duplicate archive numbers and unsafe storage URLs", () => {
    const storageRoot = mkdtempSync(join(tmpdir(), "cmi-lanna-import-"));
    const row = {
      id: "source-1",
      archive_number: "CMI-LN-0045",
      museum: "fam",
      source_title: "纹样",
      status: "published",
      detail_image_urls: ["https://example.com/not-the-bucket/a.jpg"],
      context_image_urls: [],
      label_image_urls: [],
    };

    expect(() => buildLannaArchiveImport({
      input: [row], storageRoot, createdBy: "admin", snapshotAt: "2026-08-27T12:00:00Z",
    })).toThrow(/Unsupported pattern-submissions URL/);
    expect(() => buildLannaArchiveImport({
      input: [row, { ...row, id: "source-2" }],
      storageRoot,
      createdBy: "admin",
      snapshotAt: "2026-08-27T12:00:00Z",
    })).toThrow(/Duplicate archive number/);
  });
});
