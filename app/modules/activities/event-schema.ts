import { z } from "zod";
import { HttpError } from "../../../workers/lib/http";

export const BACKFILL_EVENT_IDS = new Set([
  "cmi-ai-3d-school-workshop-01-montfort",
  "cmi-ai-3d-school-workshop-02-montfort",
]);
export const eventStatusSchema = z.enum(["draft", "published", "unpublished"]);
const nullableUrl = z
  .string()
  .url()
  .max(2048)
  .refine((value) => value.startsWith("https://"), "链接必须使用 HTTPS")
  .nullable();
const offsetDate = z.string().datetime({ offset: true });
export const eventInputSchema = z
  .object({
    title: z.string().trim().min(1).max(160),
    startsAt: offsetDate.nullable(),
    endsAt: offsetDate.nullable(),
    location: z.string().trim().max(240),
    category: z.string().trim().min(1).max(80),
    summary: z.string().trim().min(1).max(500),
    posterMediaId: z.string().min(1).max(160),
    posterAlt: z.string().trim().max(300).nullable().default(null),
    detailUrl: nullableUrl.default(null),
    registrationUrl: nullableUrl.default(null),
    initiator: z.string().trim().min(1).max(160).default("CMI Community"),
    series: z
      .object({
        name: z.string().trim().min(1).max(100),
        issue: z.number().int().positive().nullable(),
      })
      .strict()
      .nullable()
      .default(null),
    sourcePublishedAt: z.string().max(80).nullable().default(null),
    status: eventStatusSchema.default("draft"),
  })
  .strict();
export type EventInput = z.infer<typeof eventInputSchema>;
export interface EventRecord extends EventInput {
  id: string;
  eventDate: string;
  timezone: "Asia/Bangkok";
  timePrecision: "exact" | "backfill_placeholder";
  version: number;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
  poster: { url: string; width: number; height: number };
}
export interface EventActor {
  userId: string;
  actorType: "admin" | "integration";
  source?: string;
  keyId?: string;
}
export class EventValidationError extends HttpError {
  constructor(public readonly fields: Record<string, string>) {
    super(
      422,
      "VALIDATION_ERROR",
      Object.values(fields)[0] ?? "活动信息不完整。",
    );
  }
}

export function bangkokDate(value: string): string {
  return new Date(Date.parse(value) + 7 * 3600_000).toISOString().slice(0, 10);
}
export function parseEventInput(
  raw: unknown,
  options: { existing?: EventRecord | null } = {},
): EventInput {
  const parsed = eventInputSchema.safeParse(raw);
  if (!parsed.success) {
    const labels: Record<string, string> = {
      title: "活动标题不能为空，且最多 160 字。",
      startsAt: "开始时间必须为带时区偏移的有效日期时间。",
      endsAt: "结束时间必须为带时区偏移的有效日期时间。",
      location: "活动地点最多 240 字。",
      category: "分类不能为空，且最多 80 字。",
      summary: "简介不能为空，且最多 500 字。",
      posterMediaId: "请先上传有效海报。",
      posterAlt: "海报文字说明最多 300 字。",
      detailUrl: "详情链接必须是有效 HTTPS 地址。",
      registrationUrl: "报名链接必须是有效 HTTPS 地址。",
      initiator: "发起／组织不能为空，且最多 160 字。",
      series: "系列名称不能为空，期数须为正整数或留空。",
      sourcePublishedAt: "来源发布时间格式错误或超过 80 字。",
      status: "活动状态须为草稿、已发布或已下架。",
    };
    throw new EventValidationError(
      Object.fromEntries(
        parsed.error.issues.map((issue) => [
          issue.path.join(".") || "event",
          labels[String(issue.path[0])] ?? "请求含未定义字段或字段格式错误。",
        ]),
      ),
    );
  }
  const value = parsed.data;
  const existing = options.existing;
  const backfill =
    existing?.timePrecision === "backfill_placeholder" &&
    BACKFILL_EVENT_IDS.has(existing.id);
  if (!backfill && (!value.startsAt || !value.endsAt)) {
    throw new EventValidationError({
      startsAt: "新活动必须填写真实开始和结束时间。",
    });
  }
  if ((value.startsAt === null) !== (value.endsAt === null)) {
    throw new EventValidationError({ endsAt: "开始和结束时间必须同时填写。" });
  }
  if (
    value.startsAt &&
    value.endsAt &&
    Date.parse(value.endsAt) <= Date.parse(value.startsAt)
  ) {
    throw new EventValidationError({ endsAt: "结束时间必须晚于开始时间。" });
  }
  if (!existing && !value.location)
    throw new EventValidationError({ location: "新活动必须填写活动地点。" });
  if (
    backfill &&
    value.startsAt === null &&
    !value.summary.includes("该时间为后期补录")
  ) {
    throw new EventValidationError({
      summary: "补录活动简介必须保留「该时间为后期补录」。",
    });
  }
  return { ...value, posterAlt: value.posterAlt || `${value.title}海报` };
}
export function eventEtag(version: number): string {
  return `"v${version}"`;
}
