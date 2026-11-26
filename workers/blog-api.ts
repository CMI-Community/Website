import { z } from "zod";
import { saveBlogAuthor, saveBlogDraft, setBlogPublication } from "../app/modules/blog/blog-service.server";
import { blogLocale, parseBlogShortId } from "../app/modules/blog/blog-schema";
import { adminBlogImage, readBlogBytes, uploadBlogImage } from "./blog-media";
import { importWeChatBlog, importWeChatBlogImage } from "./blog-wechat";
import { getBlogTranslation } from "./blog-translation";
import { requireEventAdmin, requireSameOrigin } from "./integration-auth";
import { apiError, HttpError, isHttpError, json, methodNotAllowed } from "./lib/http";

const urlInput = z.object({ url: z.string().min(1).max(2048) }).strict();
const translationInput = z.object({ revision: z.uuid(), target: blogLocale }).strict();

function requireVersion(request: Request): number {
  const header = request.headers.get("If-Match");
  const version = Number(header?.match(/^"v(\d+)"$/)?.[1]);
  if (!header) throw new HttpError(428, "BLOG_VERSION_REQUIRED", "请重新载入编辑页再保存。");
  if (!Number.isSafeInteger(version) || version < 1) throw new HttpError(400, "BLOG_INVALID_VERSION", "版本标识无效。");
  return version;
}

async function parseBlogJson(request: Request, maxBytes = 1_000_000) {
  if (!request.headers.get("content-type")?.toLowerCase().includes("application/json"))
    throw new HttpError(415, "BLOG_JSON_REQUIRED", "请用 JSON 提交内容。");
  const raw = new TextDecoder().decode(await readBlogBytes(request.body, maxBytes));
  try { return JSON.parse(raw) as unknown; }
  catch { throw new HttpError(400, "BLOG_INVALID_JSON", "请求无法读取。"); }
}

export async function handleBlogApi(request: Request, env: CloudflareEnv, ctx: ExecutionContext): Promise<Response | null> {
  const { pathname } = new URL(request.url);
  const reader = pathname.match(/^\/api\/v1\/blog\/([^/]{1,700})\/translation$/);
  const adminPath = pathname.match(/^\/api\/v1\/admin\/blog\/(posts|authors|images|wechat)(?:\/([a-zA-Z0-9-]{1,36}))?(?:\/(publish|unpublish))?$/);
  if (!reader && !adminPath) return null;

  try {
    requireSameOrigin(request);
    if (reader) {
      if (request.method !== "POST") return methodNotAllowed(["POST"]);
      const input = translationInput.parse(await parseBlogJson(request, 1_024));
      let slug = "";
      try { slug = decodeURIComponent(reader[1]); }
      catch { throw new HttpError(404, "BLOG_NOT_FOUND", "文章暂不可用。"); }
      return await getBlogTranslation(request, env, parseBlogShortId(slug) ?? slug, input.revision, input.target);
    }
    const [, resource, id, action] = adminPath!;
    const actor = await requireEventAdmin(request, env, ctx);
    const { method } = request;
    if (resource === "posts") {
      if (id && action && method === "POST") {
        return json({ post: await setBlogPublication(env, actor, id, requireVersion(request), action === "publish") });
      }
      if (!action && ((!id && method === "POST") || (id && method === "PUT"))) {
        const post = await saveBlogDraft(env.DB, actor, await parseBlogJson(request), id, id ? requireVersion(request) : undefined);
        return json({ post }, { status: id ? 200 : 201 });
      }
      return methodNotAllowed(id && !action ? ["PUT"] : ["POST"]);
    }
    if (action) return apiError(404, "BLOG_ROUTE", "地址不存在。");
    if (resource === "authors") {
      if ((!id && method === "POST") || (id && method === "PUT"))
        return json({ author: await saveBlogAuthor(env.DB, actor, await parseBlogJson(request, 4_096), id, id ? requireVersion(request) : undefined) },
          { status: id ? 200 : 201 });
      return methodNotAllowed(id ? ["PUT"] : ["POST"]);
    }
    if (resource === "images") {
      if (id && ["GET", "HEAD"].includes(method)) return await adminBlogImage(request, env, id);
      if (method === "POST" && id === "wechat") {
        const { url } = urlInput.parse(await parseBlogJson(request, 4_096));
        return json({ image: await importWeChatBlogImage(env, actor, url) }, { status: 201 });
      }
      if (method === "POST" && !id) return json({ image: await uploadBlogImage(request, env, actor) }, { status: 201 });
      return methodNotAllowed(id && id !== "wechat" ? ["GET", "HEAD"] : ["POST"]);
    }
    if (resource === "wechat" && !id) {
      if (method !== "POST") return methodNotAllowed(["POST"]);
      const { url } = urlInput.parse(await parseBlogJson(request, 4_096));
      return json(await importWeChatBlog(env, url));
    }
    return apiError(404, "BLOG_ROUTE", "地址不存在。");
  } catch (error) {
    if (isHttpError(error)) return apiError(error.status, error.code, error.message);
    if (error instanceof z.ZodError) return apiError(422, "BLOG_VALIDATION", "请检查提交的字段。");
    console.error("Blog request failed", error instanceof Error ? error.name : "Unknown");
    return apiError(500, "BLOG_FAILED", "博客操作暂时无法完成，请稍后重试。");
  }
}
