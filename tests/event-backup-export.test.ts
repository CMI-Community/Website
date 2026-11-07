import { describe, expect, it } from "vitest";
import { parseD1ExportResponse } from "../workers/event-backup-export";

describe("D1 backup export REST contract", () => {
  it("reads the current nested completion envelope", () => {
    expect(
      parseD1ExportResponse({
        success: true,
        result: {
          at_bookmark: "bookmark",
          success: true,
          status: "complete",
          result: {
            filename: "database.sql",
            signed_url: "https://example.com/signed",
          },
        },
      }),
    ).toEqual({
      bookmark: "bookmark",
      signedUrl: "https://example.com/signed",
    });
  });
  it("also accepts the legacy flattened Workflows example and a pending job", () => {
    expect(
      parseD1ExportResponse({
        success: true,
        result: {
          at_bookmark: "bookmark",
          signed_url: "https://example.com/signed",
        },
      }).signedUrl,
    ).toBe("https://example.com/signed");
    expect(
      parseD1ExportResponse({
        success: true,
        result: { at_bookmark: "bookmark" },
      }),
    ).toEqual({ bookmark: "bookmark", signedUrl: null });
  });
  it("rejects API errors, export errors and non-HTTPS downloads", () => {
    expect(() => parseD1ExportResponse({ success: false, result: {} })).toThrow(
      /rejected/,
    );
    expect(() =>
      parseD1ExportResponse({
        success: true,
        result: { status: "error", error: "private error detail" },
      }),
    ).toThrow("D1 export failed");
    expect(() =>
      parseD1ExportResponse({
        success: true,
        result: { result: { signed_url: "http://example.com/sql" } },
      }),
    ).toThrow(/Invalid export download URL/);
  });
});
