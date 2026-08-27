import { describe, expect, it } from "vitest";
import {
  ACTIVITY_CATALOG,
  getActivityPosterSrc,
  isPublicActivityObjectKey,
  MAX_UPCOMING_ACTIVITIES,
  mergeEventMuseumPosters,
  partitionActivities,
  toEventMuseumPoster,
  type ActivityDefinition,
  type EventMuseumPoster,
} from "../app/modules/activities/activity-catalog";

const approvedActivity = ACTIVITY_CATALOG[0];

function activityAt(id: string, startsAt: string): ActivityDefinition {
  return {
    ...approvedActivity,
    id,
    startsAt,
    endsAt: new Date(Date.parse(startsAt) + 60 * 60 * 1000).toISOString(),
    poster: {
      ...approvedActivity.poster,
      objectKey: `activities/waytoagi/${id}/v1/poster.webp`,
    },
  };
}

describe("upcoming activity catalog", () => {
  it("keeps unique, typed, HTTPS and versioned public entries", () => {
    expect(new Set(ACTIVITY_CATALOG.map((activity) => activity.id)).size).toBe(
      ACTIVITY_CATALOG.length,
    );
    for (const activity of ACTIVITY_CATALOG) {
      expect(activity.title.trim()).not.toBe("");
      expect(Number.isFinite(Date.parse(activity.startsAt))).toBe(true);
      expect(Number.isFinite(Date.parse(activity.endsAt))).toBe(true);
      expect(Date.parse(activity.endsAt)).toBeGreaterThan(Date.parse(activity.startsAt));
      expect(new URL(activity.detailUrl).protocol).toBe("https:");
      expect(activity.poster.objectKey).toMatch(
        /^activities\/[a-z0-9-]+\/[a-z0-9-]+\/v[1-9][0-9]*\/[a-z0-9._-]+\.webp$/,
      );
      expect(activity.poster.width).toBeGreaterThan(0);
      expect(activity.poster.height).toBeGreaterThan(0);
      expect(getActivityPosterSrc(activity)).toBe(`/media/${activity.poster.objectKey}`);
      expect(isPublicActivityObjectKey(activity.poster.objectKey)).toBe(true);
    }
    expect(isPublicActivityObjectKey("activities/waytoagi/private/source.png")).toBe(false);
    expect(isPublicActivityObjectKey("activities/../secret.webp")).toBe(false);
  });

  it("moves an activity from upcoming to Event Museum exactly at its start", () => {
    const before = partitionActivities(ACTIVITY_CATALOG, "2026-08-30T05:29:59Z");
    expect(before.upcoming.map((activity) => activity.id)).toEqual([approvedActivity.id]);
    expect(before.started).toHaveLength(0);

    const atStart = partitionActivities(ACTIVITY_CATALOG, "2026-08-30T05:30:00Z");
    expect(atStart.upcoming).toHaveLength(0);
    expect(atStart.started.map((activity) => activity.id)).toEqual([approvedActivity.id]);
  });

  it("orders upcoming entries by start time and limits the homepage to five", () => {
    const activities = Array.from({ length: 7 }, (_, index) =>
      activityAt(
        `future-${7 - index}`,
        `2026-09-${String(7 - index).padStart(2, "0")}T12:00:00+07:00`,
      ),
    );
    const result = partitionActivities(activities, "2026-08-27T00:00:00Z");
    expect(result.upcoming).toHaveLength(MAX_UPCOMING_ACTIVITIES);
    expect(result.upcoming.map((activity) => activity.id)).toEqual([
      "future-1",
      "future-2",
      "future-3",
      "future-4",
      "future-5",
    ]);
  });

  it("projects started activities into the public poster shape and removes duplicates", () => {
    const projected = toEventMuseumPoster(approvedActivity);
    expect(projected).toMatchObject({
      imagePath: "/media/activities/waytoagi/27-improv-ai-shortfilm/v1/poster.webp",
      title: "即兴戏剧 + AI 短剧共创",
      articleUrl: "https://mp.weixin.qq.com/s/lBZWJ7kA4iqIMNnvEqxvyg",
      series: { issue: 27 },
    });

    const otherPoster: EventMuseumPoster = {
      ...projected,
      id: "existing.webp",
      articleUrl: "https://example.com/another-activity",
    };
    const duplicateByUrl: EventMuseumPoster = {
      ...projected,
      id: "legacy-catalog-id.webp",
    };
    const merged = mergeEventMuseumPosters(
      [duplicateByUrl, otherPoster],
      [approvedActivity],
    );
    expect(merged).toHaveLength(2);
    expect(merged[0]).toEqual(projected);
    expect(merged[1]).toEqual(otherPoster);
  });
});
