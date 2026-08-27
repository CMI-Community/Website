import { describe, expect, it } from "vitest";
import { patternPng } from "../scripts/seed-lanna-e2e.mjs";

describe("Lanna E2E seed image", () => {
  it("creates a deterministic 1200 by 800 RGBA PNG that Chromium can decode", () => {
    const first = patternPng(1200, 800, [[92, 38, 131], [236, 118, 35]]);
    const second = patternPng(1200, 800, [[92, 38, 131], [236, 118, 35]]);

    expect(first.subarray(0, 8).toString("hex")).toBe("89504e470d0a1a0a");
    expect(first.subarray(12, 16).toString("ascii")).toBe("IHDR");
    expect(first.readUInt32BE(16)).toBe(1200);
    expect(first.readUInt32BE(20)).toBe(800);
    expect(first[24]).toBe(8);
    expect(first[25]).toBe(6);
    expect(first.equals(second)).toBe(true);
    expect(first.byteLength).toBeGreaterThan(1_000);
  });
});
