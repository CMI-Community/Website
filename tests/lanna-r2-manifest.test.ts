import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { buildLannaR2UploadManifest } from "../scripts/lib/lanna-r2-manifest.mjs";

describe("Lanna R2 upload manifest", () => {
  it("combines verified archive objects with the complete online site baseline", () => {
    const storageRoot = mkdtempSync(join(tmpdir(), "cmi-lanna-r2-storage-"));
    const siteAssetRoot = mkdtempSync(join(tmpdir(), "cmi-lanna-r2-site-"));
    mkdirSync(join(storageRoot, "entry"), { recursive: true });
    mkdirSync(join(siteAssetRoot, "assets", "brand"), { recursive: true });
    writeFileSync(join(storageRoot, "entry", "detail.jpg"), "archive");
    writeFileSync(join(siteAssetRoot, "assets", "brand", "mark.svg"), "<svg />");

    const manifest = buildLannaR2UploadManifest({
      archiveManifest: {
        version: "cmi-project-archive-import/v1",
        manifestSha256: "a".repeat(64),
        media: [{
          sourceKind: "supabase-storage",
          sourcePath: "entry/detail.jpg",
          objectKey: "projects/waytoagi/26-lanna-museum/v1/archive/media/detail.jpg",
          mimeType: "image/jpeg",
          byteSize: 7,
          checksum: "0eb3e36bfb24dcd9bb1d1bece1531216b59539a8fde17ee80224af0653c92aa3",
          rightsStatus: "cleared",
        }],
      },
      storageRoot,
      siteAssetRoot,
      baselineCommit: "8".repeat(40),
    });

    expect(manifest).toMatchObject({
      archiveObjectCount: 1,
      siteObjectCount: 1,
      objectCount: 2,
      totalBytes: 14,
    });
    expect(manifest.objects.map((item) => item.objectKey)).toContain(
      "projects/waytoagi/26-lanna-museum/v1/site/assets/brand/mark.svg",
    );
  });

  it("rejects a source whose content no longer matches the archive manifest", () => {
    const storageRoot = mkdtempSync(join(tmpdir(), "cmi-lanna-r2-storage-"));
    const siteAssetRoot = mkdtempSync(join(tmpdir(), "cmi-lanna-r2-site-"));
    writeFileSync(join(storageRoot, "changed.jpg"), "changed");

    expect(() => buildLannaR2UploadManifest({
      archiveManifest: {
        version: "cmi-project-archive-import/v1",
        manifestSha256: "a".repeat(64),
        media: [{
          sourceKind: "supabase-storage",
          sourcePath: "changed.jpg",
          objectKey: "projects/waytoagi/26-lanna-museum/v1/archive/media/changed.jpg",
          mimeType: "image/jpeg",
          byteSize: 7,
          checksum: "0".repeat(64),
          rightsStatus: "cleared",
        }],
      },
      storageRoot,
      siteAssetRoot,
      baselineCommit: "8".repeat(40),
    })).toThrow(/verification failed/);
  });
});
