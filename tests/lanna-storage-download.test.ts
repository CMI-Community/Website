import { describe, expect, it } from "vitest";
import {
  publicObjectUrl,
  safeObjectName,
} from "../scripts/download-lanna-storage.mjs";

describe("Lanna Storage source downloader", () => {
  it("creates encoded HTTPS public object URLs", () => {
    expect(publicObjectUrl(
      "https://project.supabase.co",
      "pattern-submissions",
      "batch/展签 photo.jpg",
    )).toBe(
      "https://project.supabase.co/storage/v1/object/public/pattern-submissions/batch/%E5%B1%95%E7%AD%BE%20photo.jpg",
    );
  });

  it("rejects traversal, absolute, empty, and ambiguous paths", () => {
    for (const value of ["../secret", "/absolute.jpg", "a//b.jpg", "a/./b.jpg", ""]) {
      expect(() => safeObjectName(value)).toThrow(/storage object/i);
    }
    expect(safeObjectName("batch/detail/image.jpg")).toBe("batch/detail/image.jpg");
  });
});
