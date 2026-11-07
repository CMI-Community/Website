import { z } from "zod";
import type { EventInput } from "./event-schema";

const text = (max: number) => z.string().trim().min(1).max(max).nullable();
const link = z
  .string()
  .url()
  .max(2048)
  .refine((v) => v.startsWith("https://"))
  .nullable();
export const autofillFieldsSchema = z
  .object({
    title: text(160),
    startsAt: z.string().datetime({ offset: true }).nullable(),
    endsAt: z.string().datetime({ offset: true }).nullable(),
    location: text(240),
    category: text(80),
    summary: text(500),
    posterAlt: text(300),
    detailUrl: link,
    registrationUrl: link,
    initiator: text(160),
    series: z
      .object({
        name: z.string().trim().min(1).max(100),
        issue: z.number().int().positive().nullable(),
      })
      .strict()
      .nullable(),
    sourcePublishedAt: text(80),
  })
  .strict();
export type AutofillFields = z.infer<typeof autofillFieldsSchema>;
export type AutofillField = keyof AutofillFields;
export const autofillLabels: Record<AutofillField, string> = {
  title: "活动标题",
  startsAt: "开始时间",
  endsAt: "结束时间",
  location: "活动地点",
  category: "分类",
  summary: "简介",
  posterAlt: "海报文字说明",
  detailUrl: "原文／详情外链",
  registrationUrl: "报名链接",
  initiator: "发起／组织",
  series: "系列及期数",
  sourcePublishedAt: "来源发布时间",
};
export interface AutofillResult {
  fields: AutofillFields;
  warnings: string[];
  missingFields: AutofillField[];
}

// A suggestion never saves, publishes, replaces a poster, or clears known data.
export function mergeAutofill(
  current: EventInput,
  suggested: AutofillFields,
  overwrite: boolean,
  preserveBackfill = false,
): { form: EventInput; changed: AutofillField[]; preserved: AutofillField[] } {
  const form = { ...current };
  const changed: AutofillField[] = [],
    preserved: AutofillField[] = [];
  for (const key of Object.keys(autofillLabels) as AutofillField[]) {
    const value = suggested[key];
    if (value === null) continue;
    if (preserveBackfill && (key === "startsAt" || key === "endsAt")) {
      preserved.push(key);
      continue;
    }
    const existing = current[key];
    const empty =
      existing === null ||
      existing === "" ||
      (key === "initiator" && existing === "CMI Community");
    if (!overwrite && !empty) {
      preserved.push(key);
      continue;
    }
    let next = value;
    if (
      preserveBackfill &&
      key === "summary" &&
      typeof next === "string" &&
      !next.includes("该时间为后期补录")
    )
      next = `${next.slice(0, 488)}。该时间为后期补录`;
    if (JSON.stringify(existing) !== JSON.stringify(next)) {
      Object.assign(form, { [key]: next });
      changed.push(key);
    }
  }
  return { form, changed, preserved };
}
