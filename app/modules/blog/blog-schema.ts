import { z } from "zod";
import { emptyBlogDocument, normalizeBlogDocument, type BlogDocument } from "./blog-document";

const key = z.string().regex(/^[a-zA-Z0-9_.-]{1,160}$/);
export const blogLocale = z.enum(["zh-CN", "en"]);
export const blogEventRef = z.object({ kind: z.enum(["managed", "archive"]), id: key }).strict();

export function normalizeWeChatUrl(value: string): string | null {
  try {
    const url = new URL(value.trim());
    if (url.origin !== "https://mp.weixin.qq.com" || url.username || url.password) return null;
    if (/^\/s\/[a-zA-Z0-9_-]{6,}$/.test(url.pathname)) return url.origin + url.pathname;
    if (url.pathname !== "/s") return null;
    const identity = new URLSearchParams();
    for (const name of ["__biz", "mid", "idx", "sn"]) {
      const item = url.searchParams.get(name);
      if (!item || !/^[a-zA-Z0-9_+=/-]{1,150}$/.test(item)) return null;
      identity.set(name, item);
    }
    return url.origin + "/s?" + identity.toString();
  } catch {
    return null;
  }
}

const document = z.unknown().transform((value, ctx): BlogDocument => {
  try {
    return normalizeBlogDocument(value);
  } catch (error) {
    ctx.addIssue({ code: "custom", message: error instanceof z.ZodError ? "正文包括无法保存的格式。" : (error as Error).message });
    return z.NEVER;
  }
});

export const blogDraftSchema = z.object({
  title: z.string().trim().max(240),
  summary: z.string().trim().max(800),
  locale: blogLocale,
  displayDate: z.iso.date(),
  authorId: key.nullable(),
  sourceUrl: z.string().trim().max(2048).transform((value, ctx) => {
    if (!value) return "";
    const url = normalizeWeChatUrl(value);
    if (url) return url;
    ctx.addIssue({ code: "custom", message: "请填写公开的公众号文章链接。" });
    return z.NEVER;
  }),
  body: document,
  seriesIds: z.array(key).max(60).transform(items => [...new Set(items)]),
  events: z.array(blogEventRef).max(100).transform(items => [...new Map(items.map(event => [event.kind + ":" + event.id, event])).values()]),
  photoIds: z.array(key).max(160).transform(items => [...new Set(items)]),
}).strict();

export const blogAuthorInput = z.object({ displayName: z.string().trim().min(1).max(100), active: z.boolean() }).strict();
export type BlogDraft = z.infer<typeof blogDraftSchema>;
export type BlogLocale = z.infer<typeof blogLocale>;
export type BlogEventRef = z.infer<typeof blogEventRef>;

export interface BlogAuthor {
  id: string;
  displayName: string;
  active: boolean;
  version: number;
}

export interface BlogPost {
  id: string;
  slug: string;
  version: number;
  revisionId: string | null;
  updatedAt: string;
  draft: BlogDraft;
}

export interface BlogSummary {
  slug: string;
  title: string;
  summary: string;
  displayDate: string;
  author: string;
  locale: BlogLocale;
}

export interface BlogImage {
  id: string;
  url: string;
  width: number;
  height: number;
}

export function bangkokDate(now = new Date()): string {
  const parts = new Intl.DateTimeFormat("en", { timeZone: "Asia/Bangkok", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(now);
  return ["year", "month", "day"].map(kind => parts.find(part => part.type === kind)!.value).join("-");
}

export function newBlogDraft(): BlogDraft {
  return { title: "", summary: "", locale: "zh-CN", displayDate: bangkokDate(), authorId: null, sourceUrl: "", body: emptyBlogDocument, seriesIds: [], events: [], photoIds: [] };
}

export function blogPostPath(slug: string): string {
  return "/blog/" + encodeURIComponent(slug);
}
