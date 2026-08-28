import { describe, expect, it } from "vitest";
import {
  ACTIVITY_CATALOG,
  COMPLETED_ACTIVITY_GRACE_MS,
  getActivityPosterSrc,
  getActivityStatus,
  isPublicActivityObjectKey,
  MAX_ACTIVE_ACTIVITIES,
  MAX_COMPLETED_ACTIVITIES,
  mergeEventMuseumPosters,
  partitionActivities,
  toEventMuseumPoster,
  type ActivityDefinition,
  type EventMuseumPoster,
} from "../app/modules/activities/activity-catalog";

const dinnerActivity = ACTIVITY_CATALOG.find(
  (activity) => activity.id === "cmi-dinner-club-01-niulai-screening",
)!;
const communitySaleActivity = ACTIVITY_CATALOG.find(
  (activity) => activity.id === "cmi-community-sale-01-new-yunnan-market",
)!;
const waytoagiActivity = ACTIVITY_CATALOG.find(
  (activity) => activity.id === "waytoagi-27-improv-ai-shortfilm",
)!;
const approvedActivity = waytoagiActivity;

function activityAt(
  id: string,
  startsAt: string,
  durationMs = 60 * 60 * 1000,
): ActivityDefinition {
  return {
    ...approvedActivity,
    id,
    startsAt,
    endsAt: new Date(Date.parse(startsAt) + durationMs).toISOString(),
    poster: {
      ...approvedActivity.poster,
      objectKey: `activities/waytoagi/${id}/v1/poster.webp`,
    },
  };
}

function activityEndingAt(id: string, endsAt: string): ActivityDefinition {
  return activityAt(id, new Date(Date.parse(endsAt) - 60 * 60 * 1000).toISOString());
}

describe("activity catalog", () => {
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

  it("uses startsAt and endsAt as exact three-state boundaries", () => {
    const beforeStart = "2026-08-28T08:59:59Z";
    const atStart = "2026-08-28T09:00:00Z";
    const beforeEnd = "2026-08-28T12:59:59Z";
    const atEnd = "2026-08-28T13:00:00Z";

    expect(getActivityStatus(dinnerActivity, beforeStart)).toBe("upcoming");
    expect(getActivityStatus(dinnerActivity, atStart)).toBe("ongoing");
    expect(getActivityStatus(dinnerActivity, beforeEnd)).toBe("ongoing");
    expect(getActivityStatus(dinnerActivity, atEnd)).toBe("completed");

    const before = partitionActivities(ACTIVITY_CATALOG, beforeStart);
    expect(before.upcoming.map((activity) => activity.id)).toEqual([
      dinnerActivity.id,
      communitySaleActivity.id,
      waytoagiActivity.id,
    ]);
    expect(before.ongoing).toHaveLength(0);
    expect(before.completed).toHaveLength(0);
    expect(before.museumReady).toHaveLength(0);

    const running = partitionActivities(ACTIVITY_CATALOG, atStart);
    expect(running.ongoing.map((activity) => activity.id)).toEqual([dinnerActivity.id]);
    expect(running.upcoming.map((activity) => activity.id)).toEqual([
      communitySaleActivity.id,
      waytoagiActivity.id,
    ]);
    expect(running.completed).toHaveLength(0);

    const completed = partitionActivities(ACTIVITY_CATALOG, atEnd);
    expect(completed.completed.map((activity) => activity.id)).toEqual([dinnerActivity.id]);
    expect(completed.museumReady.map((activity) => activity.id)).toEqual([dinnerActivity.id]);
  });

  it("orders ongoing first, then future activities, with five active slots total", () => {
    const reference = "2026-09-01T12:00:00Z";
    const ongoingSoon = activityAt("ongoing-soon", "2026-09-01T11:30:00Z", 60 * 60 * 1000);
    const ongoingLater = activityAt("ongoing-later", "2026-09-01T11:00:00Z", 3 * 60 * 60 * 1000);
    const future = Array.from({ length: 5 }, (_, index) =>
      activityAt(`future-${index + 1}`, `2026-09-0${index + 2}T12:00:00Z`),
    );

    const result = partitionActivities([future[4], ongoingLater, ...future.slice(0, 4), ongoingSoon], reference);
    expect(result.ongoing.map((activity) => activity.id)).toEqual([
      "ongoing-soon",
      "ongoing-later",
    ]);
    expect(result.upcoming.map((activity) => activity.id)).toEqual([
      "future-1",
      "future-2",
      "future-3",
    ]);
    expect(result.ongoing.length + result.upcoming.length).toBe(MAX_ACTIVE_ACTIVITIES);
  });

  it("keeps every completion younger than 24 hours even when the right side exceeds five", () => {
    const referenceMs = Date.parse("2026-09-10T12:00:00Z");
    const recent = Array.from({ length: 6 }, (_, index) =>
      activityEndingAt(
        `recent-${index + 1}`,
        new Date(referenceMs - (index + 1) * 60 * 60 * 1000).toISOString(),
      ),
    );
    const older = Array.from({ length: 3 }, (_, index) =>
      activityEndingAt(
        `older-${index + 1}`,
        new Date(referenceMs - (48 + index * 24) * 60 * 60 * 1000).toISOString(),
      ),
    );

    const result = partitionActivities([...older, ...recent], new Date(referenceMs));
    expect(result.completed.map((activity) => activity.id)).toEqual([
      "recent-1",
      "recent-2",
      "recent-3",
      "recent-4",
      "recent-5",
      "recent-6",
    ]);
    expect(result.completed.length).toBeGreaterThan(MAX_COMPLETED_ACTIVITIES);
    expect(result.museumReady).toHaveLength(recent.length + older.length);
  });

  it("fills the completed timeline to five after the 24-hour guarantee expires", () => {
    const referenceMs = Date.parse("2026-09-10T12:00:00Z");
    const recent = [1, 2].map((hours) =>
      activityEndingAt(`recent-${hours}`, new Date(referenceMs - hours * 60 * 60 * 1000).toISOString()),
    );
    const older = [25, 26, 27, 28, 29].map((hours) =>
      activityEndingAt(`older-${hours}`, new Date(referenceMs - hours * 60 * 60 * 1000).toISOString()),
    );

    const result = partitionActivities([...older, ...recent], new Date(referenceMs));
    expect(result.completed.map((activity) => activity.id)).toEqual([
      "recent-1",
      "recent-2",
      "older-25",
      "older-26",
      "older-27",
    ]);
    expect(result.completed).toHaveLength(MAX_COMPLETED_ACTIVITIES);
    expect(referenceMs - Date.parse(result.completed[1].endsAt)).toBeLessThan(
      COMPLETED_ACTIVITY_GRACE_MS,
    );
  });

  it("projects completed activities into the Event Museum and removes duplicates", () => {
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
