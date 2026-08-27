import { describe, expect, it } from "vitest";
import { lannaMessages } from "../app/modules/projects/lanna-museum/content/messages";

function leafPaths(value: unknown, prefix = ""): string[] {
  if (!value || typeof value !== "object") return [prefix];
  return Object.entries(value).flatMap(([key, child]) =>
    leafPaths(child, prefix ? `${prefix}.${key}` : key),
  );
}

describe("Lanna typed content dictionaries", () => {
  it("keeps identical keys in Chinese, English, and Thai", () => {
    const chinesePaths = leafPaths(lannaMessages.zh).sort();
    expect(leafPaths(lannaMessages.en).sort()).toEqual(chinesePaths);
    expect(leafPaths(lannaMessages.th).sort()).toEqual(chinesePaths);
  });

  it("keeps the archive provenance and reinterpretation fields explicit", () => {
    for (const language of ["zh", "en", "th"] as const) {
      const archive = lannaMessages[language].archive;
      expect(archive.observation.trim()).not.toBe("");
      expect(archive.verified.trim()).not.toBe("");
      expect(archive.unknown.trim()).not.toBe("");
      expect(lannaMessages[language].ideas.reimagined).toContain("REIMAGINED");
    }
  });
});
