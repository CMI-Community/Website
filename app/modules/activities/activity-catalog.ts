import { WAYTOAGI_27_ISSUE } from "../projects/project-catalog";

export const MAX_ACTIVE_ACTIVITIES = 5;
export const MAX_COMPLETED_ACTIVITIES = 5;
export const COMPLETED_ACTIVITY_GRACE_MS = 24 * 60 * 60 * 1000;

export type ActivityStatus = "upcoming" | "ongoing" | "completed";

export interface ActivityLifecycle {
  upcoming: ActivityDefinition[];
  ongoing: ActivityDefinition[];
  completed: ActivityDefinition[];
  museumReady: ActivityDefinition[];
}

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
    id: "cmi-ai-3d-school-workshop-01-montfort",
    title: "CMI AI+3D 工坊 · 第一期｜首次走进清迈蒙福学校",
    startsAt: "2026-08-26T00:00:00+07:00",
    endsAt: "2026-08-27T00:00:00+07:00",
    dateLabel: "2026.08.26 · 周三",
    timeLabel: "校内活动 · 具体时段未公开",
    publishedAt: "2026-09-01 15:39:00",
    publishedDate: "2026-09-01",
    detailUrl: "https://mp.weixin.qq.com/s/zkHrzX6XIyrE69EsNeI9dg",
    summary: "CMI AI+3D 工坊首次走进泰国清迈蒙福学校，把社区里的技术实践、创造力与好奇心带进校园。",
    initiator: "CMI Community · Montfort College",
    category: "CMI 校园行动",
    poster: {
      objectKey: "activities/cmi-ai-3d-school-workshop/01-montfort/v1/poster.webp",
      width: 1024,
      height: 1536,
      alt: "CMI AI 加 3D 工坊第一期首次走进泰国清迈蒙福学校活动海报",
    },
    series: {
      id: "cmi-ai-3d-school-workshop",
      name: "CMI AI+3D 工坊 · 校园行动",
      issue: 1,
    },
  },
  {
    id: "cmi-ai-3d-school-workshop-02-montfort",
    title: "CMI AI+3D 工坊 · 第二期｜清迈蒙福学校",
    startsAt: "2026-09-02T13:30:00+07:00",
    endsAt: "2026-09-03T00:00:00+07:00",
    dateLabel: "2026.09.02 · 周三",
    timeLabel: "13:30 开始 · 结束时间未公开",
    publishedAt: "2026-09-01 15:39:00",
    publishedDate: "2026-09-01",
    detailUrl: "https://mp.weixin.qq.com/s/zkHrzX6XIyrE69EsNeI9dg",
    summary: "围绕一台真实的 3D 打印机，和高中年级学生一起提出问题、借助 AI 寻找线索，再回到真实机器观察与验证。",
    initiator: "CMI Community · Montfort College",
    category: "CMI 校园行动",
    poster: {
      objectKey: "activities/cmi-ai-3d-school-workshop/02-montfort/v1/poster.webp",
      width: 1024,
      height: 1536,
      alt: "CMI AI 加 3D 工坊第二期走进泰国清迈蒙福学校活动海报",
    },
    series: {
      id: "cmi-ai-3d-school-workshop",
      name: "CMI AI+3D 工坊 · 校园行动",
      issue: 2,
    },
  },
  {
    id: "cmi-public-action-sharing-01-from-should-to-can",
    title: "从「他们应该」到「我们可以」",
    startsAt: "2026-09-06T14:00:00+07:00",
    endsAt: "2026-09-06T16:00:00+07:00",
    dateLabel: "2026.09.06 · 周日",
    timeLabel: "14:00–16:00 · 清迈时间",
    publishedAt: "2026-09-01 13:08:37",
    publishedDate: "2026-09-01",
    detailUrl: "https://mp.weixin.qq.com/s/ih0j87_q_ygzUkqpFvz5bw",
    summary: "Yuki 以真实案例与长期实践经验为线索，分享普通人如何让分散的善意形成协作，让正向改变从身边开始发生。",
    initiator: "Yuki 分享 · CMI Community 支持",
    category: "民间行动分享",
    poster: {
      objectKey: "activities/cmi-public-action-sharing/01-from-should-to-can/v1/poster.webp",
      width: 1024,
      height: 1536,
      alt: "从他们应该到我们可以，民间力量如何让正向改变发生活动海报，日期为 2026 年 9 月 6 日",
    },
    series: {
      id: "cmi-public-action-sharing",
      name: "CMI 公共行动分享",
      issue: 1,
    },
  },
  {
    id: "cmi-dinner-club-01-niulai-screening",
    title: "CMI 吃饭俱乐部 #1 · 周五《牛来》观影",
    startsAt: "2026-08-28T16:00:00+07:00",
    endsAt: "2026-08-28T20:00:00+07:00",
    dateLabel: "2026.08.28 · 周五",
    timeLabel: "16:00–20:00 · 清迈时间",
    publishedAt: "2026-08-27 19:57:21",
    publishedDate: "2026-08-27",
    detailUrl: "https://mp.weixin.qq.com/s/0Z1DTbX93zrAfwlCVxjzGg",
    summary: "每个人带一份愿意分享的食物，在 CMI Studio 一边吃饭，一边共同观看《牛来》；活动限 10 人。",
    initiator: "CMI 吃饭俱乐部 · 空想食堂活动分支",
    category: "CMI 吃饭俱乐部",
    poster: {
      objectKey: "activities/cmi-dinner-club/01-niulai-screening/v1/poster.webp",
      width: 941,
      height: 1672,
      alt: "CMI 吃饭俱乐部第一期《牛来》观影会活动海报",
    },
    series: {
      id: "cmi-dinner-club",
      name: "CMI 吃饭俱乐部",
      issue: 1,
    },
  },
  {
    id: "cmi-community-sale-01-new-yunnan-market",
    title: "8月29日｜ 清迈新云南市场 CMI 社区义卖 #1",
    startsAt: "2026-08-29T07:00:00+07:00",
    endsAt: "2026-08-29T12:00:00+07:00",
    dateLabel: "2026.08.29 · 周六",
    timeLabel: "07:00–12:00 · 清迈时间",
    publishedAt: "2026-08-28 06:30:31",
    publishedDate: "2026-08-28",
    detailUrl: "https://mp.weixin.qq.com/s/SW_BaQ3eFgWgsYBxWoftlQ",
    summary: "CMI 第一次在新云南市场摆摊，带二手书籍和 3D 打印玩具参与社区义卖；当天也是市场首次增加周六营业。",
    initiator: "CMI Community · 新云南市场邀请",
    category: "CMI 社区义卖",
    poster: {
      objectKey: "activities/cmi-community-sale/01-new-yunnan-market/v1/poster.webp",
      width: 1024,
      height: 1535,
      alt: "CMI 社区义卖第一期新云南市场活动海报",
    },
    series: {
      id: "cmi-community-sale",
      name: "CMI 社区义卖",
      issue: 1,
    },
  },
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

export function getActivityStatus(
  activity: ActivityDefinition,
  referenceTime: string | Date = new Date(),
): ActivityStatus {
  const reference = asTimestamp(referenceTime);
  if (reference < asTimestamp(activity.startsAt)) return "upcoming";
  if (reference < asTimestamp(activity.endsAt)) return "ongoing";
  return "completed";
}

export function partitionActivities(
  activities: readonly ActivityDefinition[],
  referenceTime: string | Date = new Date(),
): ActivityLifecycle {
  const reference = asTimestamp(referenceTime);
  const upcoming = [...activities]
    .filter((activity) => getActivityStatus(activity, referenceTime) === "upcoming")
    .sort(
    (left, right) => asTimestamp(left.startsAt) - asTimestamp(right.startsAt),
  );
  const ongoing = [...activities]
    .filter((activity) => getActivityStatus(activity, referenceTime) === "ongoing")
    .sort((left, right) => asTimestamp(left.endsAt) - asTimestamp(right.endsAt));
  const activeSlots = Math.max(0, MAX_ACTIVE_ACTIVITIES - ongoing.length);
  const museumReady = [...activities]
    .filter((activity) => getActivityStatus(activity, referenceTime) === "completed")
    .sort((left, right) => asTimestamp(right.endsAt) - asTimestamp(left.endsAt));
  const guaranteed = museumReady.filter(
    (activity) => reference - asTimestamp(activity.endsAt) < COMPLETED_ACTIVITY_GRACE_MS,
  );
  const guaranteedIds = new Set(guaranteed.map((activity) => activity.id));
  const completed = [
    ...guaranteed,
    ...museumReady
      .filter((activity) => !guaranteedIds.has(activity.id))
      .slice(0, Math.max(0, MAX_COMPLETED_ACTIVITIES - guaranteed.length)),
  ];

  return {
    upcoming: upcoming.slice(0, activeSlots),
    ongoing: ongoing.slice(0, MAX_ACTIVE_ACTIVITIES),
    completed,
    museumReady,
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
  completedActivities: readonly ActivityDefinition[],
): EventMuseumPoster[] {
  const activityPosters = completedActivities.map(toEventMuseumPoster);
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
