import { describe, expect, it } from "vitest";
import { planBackupRetention } from "../workers/event-backup-policy";

describe("backup retention", () => {
  it("retains 35 distinct daily points and 12 monthly points without deleting incomplete evidence", () => {
    const points = Array.from({ length: 420 }, (_, index) => ({
      key: `backup-${index}`,
      createdAt: new Date(
        Date.UTC(2026, 10, 1) - index * 86400000,
      ).toISOString(),
      complete: true,
    }));
    const result = planBackupRetention([
      ...points,
      { key: "failed", createdAt: "2026-11-01", complete: false },
    ]);
    for (let index = 0; index < 35; index++)
      expect(result.keep).toContain(`backup-${index}`);
    expect(
      new Set(
        result.keep.map((key) =>
          points.find((point) => point.key === key)!.createdAt.slice(0, 7),
        ),
      ).size,
    ).toBe(12);
    expect(result.reviewForRemoval).not.toContain("failed");
    expect(result.reviewForRemoval).toContain("backup-419");
  });
});
