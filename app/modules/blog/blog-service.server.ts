import { z } from "zod";
import { guardedContentBatch } from "../community-content/content-service.server";
import { listArchiveEvents } from "../community-content/archive-repository.server";
import type { EventAdmin } from "../../../workers/integration-auth";
import { HttpError } from "../../../workers/lib/http";
import { blogImageReferences, findBlogSource, getBlogAuthor, getBlogPost } from "./blog-repository.server";
import { blogAuthorInput, blogDraftSchema, type BlogDraft } from "./blog-schema";

function validate<Schema extends z.ZodType>(schema: Schema, raw: unknown): z.infer<Schema> {
  const input = schema.safeParse(raw);
  if (input.success) return input.data;
  const issue = input.error.issues[0];
  throw new HttpError(422, "BLOG_VALIDATION", issue?.code === "custom" ? issue.message : "请检查字段：" + (issue?.path.join(".") || "文章") + "。");
}

function audit(db: D1Database, actor: EventAdmin, action: string, type: string, id: string) {
  return db.prepare("INSERT INTO audit_logs(id,actor_user_id,action,resource_type,resource_id) VALUES(?,?,?,?,?)")
    .bind(crypto.randomUUID(), actor.userId, action, type, id);
}

export async function saveBlogAuthor(db: D1Database, actor: EventAdmin, raw: unknown, id = "", version?: number) {
  const input = validate(blogAuthorInput, raw);
  if (id && !await getBlogAuthor(db, id)) throw new HttpError(404, "AUTHOR_NOT_FOUND", "作者不存在。");
  const authorId = id || crypto.randomUUID();
  const now = new Date().toISOString();
  const write = id
    ? db.prepare("UPDATE blog_authors SET display_name=?,active=?,version=version+1,updated_at=? WHERE id=?")
      .bind(input.displayName, Number(input.active), now, id)
    : db.prepare("INSERT INTO blog_authors(id,display_name,active,updated_at) VALUES(?,?,?,?)")
      .bind(authorId, input.displayName, Number(input.active), now);
  await guardedContentBatch(db, actor, [write, audit(db, actor, id ? "blog.author.updated" : "blog.author.created", "blog_author", authorId)],
    id ? "EXISTS(SELECT 1 FROM blog_authors WHERE id=? AND version=?)" : "1", id ? [id, version] : []);
  return (await getBlogAuthor(db, authorId))!;
}

function makeSlug(title: string, id: string) {
  const prefix = [...title.normalize("NFKC").toLowerCase().replace(/[^\p{L}\p{N}]+/gu, "-")]
    .slice(0, 54).join("").replace(/^-+|-+$/g, "");
  return (prefix || "article") + "-" + id.slice(0, 8);
}

export async function saveBlogDraft(db: D1Database, actor: EventAdmin, raw: unknown, id = "", version?: number) {
  const draft = validate(blogDraftSchema, raw);
  const previous = id ? await getBlogPost(db, id) : null;
  if (id && !previous) throw new HttpError(404, "BLOG_NOT_FOUND", "文章不存在。");
  if (draft.sourceUrl) {
    const found = await findBlogSource(db, draft.sourceUrl);
    if (found && found.id !== id) throw new HttpError(409, "BLOG_SOURCE_IN_USE", "已有文章使用这个公众号链接。");
  }
  if (draft.authorId) {
    const author = await getBlogAuthor(db, draft.authorId);
    if (!author || (!author.active && previous?.draft.authorId !== draft.authorId))
      throw new HttpError(422, "BLOG_AUTHOR_UNAVAILABLE", "请选择已启用的作者。");
  }
  const now = new Date().toISOString();
  const postId = id || crypto.randomUUID();
  const source = draft.sourceUrl || null;
  const write = id
    ? db.prepare("UPDATE blog_posts SET draft_json=?,draft_source_url=?,updated_at=?,version=version+1 WHERE id=?")
      .bind(JSON.stringify(draft), source, now, id)
    : db.prepare("INSERT INTO blog_posts(id,slug,draft_json,draft_source_url,created_at,updated_at) VALUES(?,?,?,?,?,?)")
      .bind(postId, makeSlug(draft.title, postId), JSON.stringify(draft), source, now, now);
  const duplicateCheck = source ? ` AND NOT EXISTS(SELECT 1 FROM blog_posts p LEFT JOIN blog_revisions r ON r.id=p.published_revision_id
    WHERE p.id<>? AND (p.draft_source_url=? OR r.source_url=?))` : "";
  await guardedContentBatch(db, actor, [write, audit(db, actor, id ? "blog.updated" : "blog.created", "blog_post", postId)],
    (id ? "EXISTS(SELECT 1 FROM blog_posts WHERE id=? AND version=?)" : "1") + duplicateCheck,
    [...(id ? [id, version] : []), ...(source ? [postId, source, source] : [])]);
  return (await getBlogPost(db, postId))!;
}

async function assertIds(db: D1Database, select: string, ids: string[], message: string) {
  if (!ids.length) return;
  const result = await db.prepare(select + " IN (SELECT value FROM json_each(?))").bind(JSON.stringify(ids)).first<number>("total");
  if (result !== ids.length) throw new HttpError(422, "BLOG_REFERENCE_MISSING", message);
}

async function verifyPublishable(env: Pick<CloudflareEnv, "DB" | "MEDIA">, draft: BlogDraft) {
  const { uploads, photos, pending, embedWithoutUrl, hasContent } = blogImageReferences(draft.body);
  if (!draft.title || !draft.authorId || !hasContent)
    throw new HttpError(422, "BLOG_FIELDS_REQUIRED", "发布前请填写标题、署名和正文。");
  if (pending) throw new HttpError(422, "BLOG_IMAGE_MISSING", "请补传或移除正文中缺失的图片。");
  if (embedWithoutUrl && !draft.sourceUrl)
    throw new HttpError(422, "BLOG_SOURCE_REQUIRED", "请填写公众号原文网址，让正文里的微信组件有入口。");

  const archiveIds = draft.events.filter(event => event.kind === "archive").map(event => event.id);
  await Promise.all([
    assertIds(env.DB, "SELECT COUNT(*) AS total FROM community_series WHERE id", draft.seriesIds, "有系列已经移除，请检查关联。"),
    assertIds(env.DB, "SELECT COUNT(*) AS total FROM community_photos WHERE id", [...new Set([...draft.photoIds, ...photos])], "有照片已经移除，请检查关联。"),
    assertIds(env.DB, "SELECT COUNT(*) AS total FROM event_details WHERE content_id", draft.events.filter(event => event.kind === "managed").map(event => event.id), "有活动已经移除，请检查关联。"),
    assertIds(env.DB, "SELECT COUNT(*) AS total FROM blog_images WHERE id", uploads, "有正文图片尚未上传成功。"),
    (async () => {
      if (!archiveIds.length) return;
      const archive = new Set((await listArchiveEvents(env)).map(event => event.id));
      if (archiveIds.some(id => !archive.has(id)))
        throw new HttpError(422, "BLOG_ARCHIVE_MISSING", "有历史活动已经移除，请检查关联。");
    })(),
  ]);
  return uploads;
}

export async function setBlogPublication(
  env: Pick<CloudflareEnv, "DB" | "MEDIA">, actor: EventAdmin, id: string, version: number, publish: boolean,
) {
  const db = env.DB;
  const post = await getBlogPost(db, id);
  if (!post) throw new HttpError(404, "BLOG_NOT_FOUND", "文章不存在。");
  if (post.version !== version) throw new HttpError(409, "VERSION_CONFLICT", "文章已更新，请刷新后重试。");
  if (!publish && !post.revisionId) return post;

  const draft = post.draft;
  const revisionId = publish ? crypto.randomUUID() : null;
  const now = new Date().toISOString();
  const statements: D1PreparedStatement[] = [];
  if (revisionId) {
    const uploads = await verifyPublishable(env, draft);
    statements.push(
      db.prepare(`INSERT INTO blog_revisions(id,post_id,title,summary,locale,display_date,author_id,source_url,body_json,published_at)
        VALUES(?,?,?,?,?,?,?,?,?,?)`).bind(revisionId, id, draft.title, draft.summary, draft.locale, draft.displayDate,
        draft.authorId, draft.sourceUrl || null, JSON.stringify(draft.body), now),
      db.prepare("INSERT INTO blog_revision_series(revision_id,series_id) SELECT ?,value FROM json_each(?)")
        .bind(revisionId, JSON.stringify(draft.seriesIds)),
      db.prepare(`INSERT INTO blog_revision_events(revision_id,kind,event_id)
        SELECT ?,json_extract(value,'$.kind'),json_extract(value,'$.id') FROM json_each(?)`)
        .bind(revisionId, JSON.stringify(draft.events)),
      db.prepare("INSERT INTO blog_revision_photos(revision_id,photo_id,position) SELECT ?,value,CAST(key AS INTEGER) FROM json_each(?)")
        .bind(revisionId, JSON.stringify(draft.photoIds)),
      db.prepare("INSERT INTO blog_revision_images(revision_id,image_id) SELECT ?,value FROM json_each(?)")
        .bind(revisionId, JSON.stringify(uploads)),
    );
  }
  statements.push(
    db.prepare("UPDATE blog_posts SET published_revision_id=?,updated_at=?,version=version+1 WHERE id=?").bind(revisionId, now, id),
    audit(db, actor, publish ? "blog.published" : "blog.unpublished", "blog_post", id),
  );
  await guardedContentBatch(db, actor, statements, "EXISTS(SELECT 1 FROM blog_posts WHERE id=? AND version=?)", [id, version]);
  return (await getBlogPost(db, id))!;
}
