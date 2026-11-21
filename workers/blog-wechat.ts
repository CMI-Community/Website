import { parseWeChatPage } from "../app/modules/blog/blog-html";
import { blogImageMaxBytes } from "../app/modules/blog/blog-document";
import { normalizeWeChatUrl } from "../app/modules/blog/blog-schema";
import { findBlogSource } from "../app/modules/blog/blog-repository.server";
import { HttpError } from "./lib/http";
import { readBlogBytes, storeBlogImage } from "./blog-media";
import type { EventAdmin } from "./integration-auth";

export function weChatBlogImportEnabled(env: CloudflareEnv) {
  return env.APP_ENV !== "production" || env.BLOG_WECHAT_IMPORT_ENABLED === "true";
}

export async function importWeChatBlog(env: CloudflareEnv, raw: string) {
  if (!weChatBlogImportEnabled(env)) throw new HttpError(404, "BLOG_IMPORT_DISABLED", "可以粘贴公众号图文。");
  const sourceUrl = normalizeWeChatUrl(raw);
  if (!sourceUrl) throw new HttpError(422, "BLOG_WECHAT_URL", "请填写公开的公众号文章链接。");
  const prior = await findBlogSource(env.DB, sourceUrl);
  if (prior) return { existingId: prior.id };
  try {
    const response = await fetch(sourceUrl, { redirect: "error", signal: AbortSignal.timeout(12_000) });
    if (response.ok && response.headers.get("content-type")?.includes("text/html")) {
      const html = new TextDecoder().decode(await readBlogBytes(response.body, 3 * 1024 * 1024));
      const imported = parseWeChatPage(html, sourceUrl);
      if (imported) return { sourceUrl, ...imported };
    }
  } catch (error) {
    if (error instanceof HttpError && error.status === 413)
      throw new HttpError(413, "BLOG_IMPORT_LIMIT", "文章网页较大，请把图文分段粘贴到编辑器。");
  }
  throw new HttpError(422, "BLOG_WECHAT_UNREADABLE", "公众号页面暂时无法读取。请在浏览器打开原文，然后复制图文到编辑器。");
}

export async function importWeChatBlogImage(env: CloudflareEnv, actor: EventAdmin, raw: string) {
  const url = (() => {
    try { return new URL(raw); } catch { return null; }
  })();
  if (!url || url.protocol !== "https:" || url.username || url.password || url.port ||
      !["mmbiz.qpic.cn", "mmbiz.qlogo.cn", "res.wx.qq.com"].includes(url.hostname))
    throw new HttpError(422, "BLOG_IMAGE_SOURCE", "请下载原图后手动上传。");

  const response = await fetch(url, { redirect: "error", signal: AbortSignal.timeout(15_000) })
    .catch(() => null);
  if (!response?.ok) throw new HttpError(422, "BLOG_IMAGE_SOURCE", "原图暂时无法下载，请手动补传。");
  return storeBlogImage(env, actor, await readBlogBytes(response.body, blogImageMaxBytes));
}
