import { WAYTOAGI_27_ISSUE } from "../projects/project-catalog";

export const MAX_UPCOMING_ACTIVITIES = 5;

export interface ActivityDefinition {
  id: string;
  title: string;
  startsAt: string;
  endsAt: string;
  dateLabel: string;
  timeLabel: string;
  publishedAt: string;
  publishedDate: string;
  detailUrl: `https://${string}`;
  summary: string;
  initiator: string;
  category: string;
  poster: {
    objectKey: string;
    width: number;
    height: number;
    alt: string;
  };
  series: {
    id: string;
    name: string;
    issue: number;
  };
}

export interface EventMuseumPoster {
  id: string;
  imagePath: string;
  width: number;
  height: number;
  title: string;
  publishedAt: string;
  publishedDate: string;
  eventTime: string;
  initiator: string;
  summary: string;
  articleUrl: string;
  series: { name: string; issue: number | null };
  category: string;
}

export const ACTIVITY_CATALOG = [
  {
    id: "waytoagi-27-improv-ai-shortfilm",
    title: WAYTOAGI_27_ISSUE.title,
    startsAt: "2026-08-30T12:30:00+07:00",
    endsAt: "2026-08-30T17:30:00+07:00",
    dateLabel: "2026.08.30 · 周日",
    timeLabel: "12:30–17:30 · 清迈时间",
    publishedAt: "2026-08-27 17:01:31",
    publishedDate: "2026-08-27",
    detailUrl: WAYTOAGI_27_ISSUE.publication.href,
    summary: "先在草地上用即兴戏剧共同创造角色、场景与故事，再把现场共创交给 AI，完成一支 30–60 秒的短片开场。",
    initiator: "WaytoAGI 发起 · CMI Community 清迈场活动设计",
    category: "AI 共创活动",
    poster: {
      objectKey: "activities/waytoagi/27-improv-ai-shortfilm/v1/poster.webp",
      width: 864,
      height: 1821,
      alt: "WaytoAGI 第 27 期清迈场，即兴戏剧与 AI 短剧共创活动海报",
    },
    series: {
      id: "waytoagi-skills-exchange-chiang-mai",
      name: "WaytoAGI 切磋大会 · 清迈场",
      issue: WAYTOAGI_27_ISSUE.number,
    },
  },
] as const satisfies readonly ActivityDefinition[];

function asTimestamp(value: string | Date): number {
  const timestamp = value instanceof Date ? value.getTime() : Date.parse(value);
  if (!Number.isFinite(timestamp)) throw new Error(`Invalid activity reference time: ${String(value)}`);
  return timestamp;
}

export function getActivityPosterSrc(activity: ActivityDefinition): string {
  return `/media/${activity.poster.objectKey}`;
}

export function partitionActivities(
  activities: readonly ActivityDefinition[],
  referenceTime: string | Date = new Date(),
) {
  const reference = asTimestamp(referenceTime);
  const ordered = [...activities].sort(
    (left, right) => asTimestamp(left.startsAt) - asTimestamp(right.startsAt),
  );

  return {
    upcoming: ordered
      .filter((activity) => asTimestamp(activity.startsAt) > reference)
      .slice(0, MAX_UPCOMING_ACTIVITIES),
    started: ordered
      .filter((activity) => asTimestamp(activity.startsAt) <= reference)
      .reverse(),
  };
}

export function toEventMuseumPoster(activity: ActivityDefinition): EventMuseumPoster {
  return {
    id: `activity-${activity.id}.webp`,
    imagePath: getActivityPosterSrc(activity),
    width: activity.poster.width,
    height: activity.poster.height,
    title: activity.title,
    publishedAt: activity.publishedAt,
    publishedDate: activity.publishedDate,
    eventTime: `${activity.dateLabel} · ${activity.timeLabel}`,
    initiator: activity.initiator,
    summary: activity.summary,
    articleUrl: activity.detailUrl,
    series: { name: activity.series.name, issue: activity.series.issue },
    category: activity.category,
  };
}

export function mergeEventMuseumPosters(
  catalogPosters: readonly EventMuseumPoster[],
  startedActivities: readonly ActivityDefinition[],
): EventMuseumPoster[] {
  const activityPosters = startedActivities.map(toEventMuseumPoster);
  const activityIds = new Set(activityPosters.map((poster) => poster.id));
  const activityUrls = new Set(activityPosters.map((poster) => poster.articleUrl));
  return [
    ...activityPosters,
    ...catalogPosters.filter(
      (poster) => !activityIds.has(poster.id) && !activityUrls.has(poster.articleUrl),
    ),
  ];
}

const PUBLIC_ACTIVITY_OBJECT_KEYS: ReadonlySet<string> = new Set<string>(
  ACTIVITY_CATALOG.map((activity) => activity.poster.objectKey),
);

export function isPublicActivityObjectKey(objectKey: string): boolean {
  return PUBLIC_ACTIVITY_OBJECT_KEYS.has(objectKey);
}
