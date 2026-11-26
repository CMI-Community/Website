import { guardedContentBatch } from "../app/modules/community-content/content-service.server";
import { blogImageMaxBytes } from "../app/modules/blog/blog-document";
import { adminBlogImageUrl, publicBlogImageUrl } from "../app/modules/blog/blog-repository.server";
import { parseBlogShortId } from "../app/modules/blog/blog-schema";
import { HttpError, methodNotAllowed } from "./lib/http";
import { inspectImage } from "./event-media";
import type { EventAdmin } from "./integration-auth";

export async function readBlogBytes(stream: ReadableStream<Uint8Array> | null, limit: number) {
  if (!stream) throw new HttpError(400, "BLOG_EMPTY_BODY", "没有可读取的内容。");
  const reader = stream.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    for (;;) {
      const next = await reader.read();
      if (next.done) break;
      size += next.value.byteLength;
      if (size > limit) {
        await reader.cancel();
        throw new HttpError(413, "BLOG_TOO_LARGE", "内容超过允许大小。");
      }
      chunks.push(next.value);
    }
  } finally {
    reader.releaseLock();
  }
  const buffer = new Uint8Array(size);
  let position = 0;
  for (const chunk of chunks) {
    buffer.set(chunk, position);
    position += chunk.byteLength;
  }
  return buffer.buffer;
}

function blogImageInfo(bytes: ArrayBuffer) {
  const data = new Uint8Array(bytes);
  const signature = String.fromCharCode(...data.slice(0, 6));
  if (signature === "GIF89a" || signature === "GIF87a") {
    const dims = new DataView(bytes);
    const width = data.length >= 14 ? dims.getUint16(6, true) : 0;
    const height = data.length >= 14 ? dims.getUint16(8, true) : 0;
    if (data.at(-1) !== 0x3b || width < 1 || height < 1 || width * height > 40_000_000 || width > 16000 || height > 16000)
      throw new HttpError(422, "BLOG_INVALID_IMAGE", "请选择完整的 GIF 图片。");
    return { width, height, mimeType: "image/gif" };
  }
  try {
    return inspectImage(bytes);
  } catch {
    throw new HttpError(422, "BLOG_INVALID_IMAGE", "请上传完整的 JPG、PNG、WebP 或 GIF 图片，大小在 10 MB 以内。");
  }
}

export async function storeBlogImage(env: CloudflareEnv, actor: EventAdmin, bytes: ArrayBuffer) {
  const image = blogImageInfo(bytes);
  const id = crypto.randomUUID();
  const key = "blog/" + id;
  const now = new Date().toISOString();
  await env.EVENT_MEDIA.put(key, bytes, { httpMetadata: { contentType: image.mimeType } });
  try {
    await guardedContentBatch(env.DB, actor, [
      env.DB.prepare("INSERT INTO blog_images(id,object_key,mime_type,width,height,created_at) VALUES(?,?,?,?,?,?)")
        .bind(id, key, image.mimeType, image.width, image.height, now),
    ]);
  } catch (error) {
    await env.EVENT_MEDIA.delete(key).catch(() => {});
    throw error;
  }
  return { id, url: adminBlogImageUrl(id), width: image.width, height: image.height };
}

export async function uploadBlogImage(request: Request, env: CloudflareEnv, actor: EventAdmin) {
  if (!request.headers.get("content-type")?.startsWith("multipart/form-data"))
    throw new HttpError(415, "BLOG_IMAGE_FORM", "请提交一张图片。");
  const buffer = await readBlogBytes(request.body, blogImageMaxBytes + 65_536);
  const form = await new Response(buffer, { headers: { "content-type": request.headers.get("content-type")! } }).formData()
    .catch(() => { throw new HttpError(400, "BLOG_IMAGE_FORM", "无法读取所选文件。"); });
  const file = form.get("file");
  if (!(file instanceof File)) throw new HttpError(400, "BLOG_IMAGE_FORM", "请选择一张图片。");
  if (file.size > blogImageMaxBytes) throw new HttpError(413, "BLOG_IMAGE_TOO_LARGE", "图片大小须在 10 MB 以内。");
  return storeBlogImage(env, actor, await file.arrayBuffer());
}

interface MediaRow { objectKey: string; mimeType: string }
async function readImage(request: Request, env: CloudflareEnv, row: MediaRow | null) {
  if (!["GET", "HEAD"].includes(request.method)) return methodNotAllowed(["GET", "HEAD"]);
  const headers = new Headers({ "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff", "Cross-Origin-Resource-Policy": "same-origin" });
  if (!row) return new Response(null, { status: 404, headers });
  const content = request.method === "HEAD" ? null : await env.EVENT_MEDIA.get(row.objectKey);
  const asset = request.method === "HEAD" ? await env.EVENT_MEDIA.head(row.objectKey) : content;
  if (!asset) return new Response(null, { status: 404, headers });
  headers.set("Content-Type", row.mimeType);
  headers.set("Content-Length", String(asset.size));
  return new Response(content?.body ?? null, { headers });
}

export async function adminBlogImage(request: Request, env: CloudflareEnv, id: string) {
  const row = await env.DB.prepare("SELECT object_key AS objectKey,mime_type AS mimeType FROM blog_images WHERE id=?")
    .bind(id).first<MediaRow>();
  return readImage(request, env, row);
}

export async function handleBlogMedia(request: Request, env: CloudflareEnv): Promise<Response | null> {
  const path = new URL(request.url).pathname;
  const match = path.match(/^\/media\/blog\/([^/]{1,700})\/([0-9a-f-]{36})$/);
  if (!match) return null;
  let segment = "";
  try {
    segment = decodeURIComponent(match[1]);
  } catch {
    return new Response(null, { status: 404 });
  }
  const id = match[2];
  if (path !== publicBlogImageUrl(segment, id)) return new Response(null, { status: 404 });
  const reference = parseBlogShortId(segment) ?? segment;
  const column = typeof reference === "number" ? "s.short_id" : "p.slug";
  const row = await env.DB.prepare(`SELECT i.object_key AS objectKey,i.mime_type AS mimeType
    FROM blog_posts p JOIN blog_short_links s ON s.post_id=p.id
    JOIN blog_revision_images link ON link.revision_id=p.published_revision_id
    JOIN blog_images i ON i.id=link.image_id WHERE ${column}=? AND i.id=?`).bind(reference, id).first<MediaRow>();
  return readImage(request, env, row);
}
