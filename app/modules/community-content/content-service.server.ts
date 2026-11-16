import { z } from "zod";
import {
  adminWriteGuard,
  type EventAdmin,
} from "../../../workers/integration-auth";
import { HttpError } from "../../../workers/lib/http";
import { sanitizePhotoCatalog } from "../photo-museum/photo-catalog";
import { getPhoto, getSeries } from "./content-repository.server";
import { photoInputSchema, seriesInputSchema } from "./content-schema";

export function parseContent<T extends z.ZodType>(
  schema: T,
  input: unknown,
): z.infer<T> {
  const parsed = schema.safeParse(input);
  if (!parsed.success)
    throw new HttpError(
      422,
      "VALIDATION_ERROR",
      `请检查填写内容：${parsed.error.issues[0]?.path.join(".") || "字段"}。`,
    );
  return parsed.data;
}
// Zod defaults are useful for creation, but omitted PATCH fields must stay omitted.
function parsePatch<T extends z.ZodObject>(
  schema: T,
  raw: unknown,
): z.infer<T> {
  const parsed = parseContent(schema, raw) as Record<string, unknown>;
  return Object.fromEntries(
    Object.keys(raw as object).map((key) => [key, parsed[key]]),
  ) as z.infer<T>;
}
export async function guardedContentBatch(
  db: D1Database,
  actor: EventAdmin,
  statements: D1PreparedStatement[],
  condition = "1",
  bindings: unknown[] = [],
) {
  const guard = adminWriteGuard(actor);
  const assertion = crypto.randomUUID();
  try {
    return await db.batch([
      db
        .prepare(
          `INSERT INTO community_write_assertions(id,passed) SELECT ?,CASE WHEN (${guard.sql}) AND (${condition}) THEN 1 ELSE 0 END`,
        )
        .bind(assertion, ...guard.bindings, ...bindings),
      ...statements,
      db
        .prepare("DELETE FROM community_write_assertions WHERE id=?")
        .bind(assertion),
    ]);
  } catch (error) {
    const active = await db
      .prepare(`SELECT 1 WHERE ${guard.sql}`)
      .bind(...guard.bindings)
      .first();
    if (!active)
      throw new HttpError(
        403,
        "ADMIN_SESSION_CHANGED",
        "管理会话已失效，请重新登录。",
      );
    if (String(error).includes("UNIQUE"))
      throw new HttpError(
        409,
        "CONTENT_CONFLICT",
        "该网址标识或图片已使用，请调整后重试。",
      );
    throw new HttpError(
      409,
      "VERSION_CONFLICT",
      "内容已发生变化，请刷新后重试。",
    );
  }
}
function audit(
  db: D1Database,
  actor: EventAdmin,
  action: string,
  type: string,
  id: string,
) {
  return db
    .prepare(
      "INSERT INTO audit_logs(id,actor_user_id,action,resource_type,resource_id) VALUES(?,?,?,?,?)",
    )
    .bind(crypto.randomUUID(), actor.userId, action, type, id);
}
async function assertReferences(
  db: D1Database,
  seriesId: string | null,
  eventId?: string | null,
) {
  if (
    seriesId &&
    !(await db
      .prepare("SELECT 1 FROM community_series WHERE id=?")
      .bind(seriesId)
      .first())
  )
    throw new HttpError(422, "SERIES_NOT_FOUND", "所选栏目不存在。");
  if (
    eventId &&
    !(await db
      .prepare("SELECT 1 FROM event_details WHERE content_id=?")
      .bind(eventId)
      .first())
  )
    throw new HttpError(422, "EVENT_NOT_FOUND", "所选活动不存在。");
}
export async function verifiedMedia(db: D1Database, id: string) {
  const row = await db
    .prepare(
      "SELECT m.width,m.height,a.object_key AS objectKey,a.mime_type AS mimeType FROM event_media m JOIN media_assets a ON a.id=m.media_id WHERE m.media_id=? AND a.status='ready' AND m.storage='private' AND m.verified_at IS NOT NULL",
    )
    .bind(id)
    .first<{
      width: number;
      height: number;
      objectKey: string;
      mimeType: string;
    }>();
  if (!row) throw new HttpError(422, "MEDIA_NOT_READY", "请先上传有效图片。");
  return row;
}
export async function saveSeries(
  db: D1Database,
  actor: EventAdmin,
  raw: unknown,
  id?: string,
  version?: number,
) {
  const existing = id ? await getSeries(db, id) : null;
  if (id && !existing)
    throw new HttpError(404, "SERIES_NOT_FOUND", "栏目不存在。");
  const patch = existing ? parsePatch(seriesInputSchema.partial(), raw) : null;
  const merged = existing ? { ...existing, ...patch } : null;
  const input = parseContent(
    seriesInputSchema,
    merged
      ? Object.fromEntries(
          Object.keys(seriesInputSchema.shape).map((key) => [
            key,
            merged[key as keyof typeof merged],
          ]),
        )
      : raw,
  );
  if (existing && version !== existing.version)
    throw new HttpError(409, "VERSION_CONFLICT", "栏目已更新，请刷新后重试。");
  if (input.logoMediaId) await verifiedMedia(db, input.logoMediaId);
  const key = existing?.id ?? crypto.randomUUID(),
    now = new Date().toISOString();
  const statement = existing
    ? db
        .prepare(
          "UPDATE community_series SET slug=?,name=?,description=?,logo_media_id=?,status=?,sort_order=?,version=version+1,updated_at=? WHERE id=?",
        )
        .bind(
          input.slug,
          input.name,
          input.description,
          input.logoMediaId,
          input.status,
          input.sortOrder,
          now,
          key,
        )
    : db
        .prepare(
          "INSERT INTO community_series(id,slug,name,description,logo_media_id,status,sort_order,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?)",
        )
        .bind(
          key,
          input.slug,
          input.name,
          input.description,
          input.logoMediaId,
          input.status,
          input.sortOrder,
          now,
          now,
        );
  await guardedContentBatch(
    db,
    actor,
    [
      statement,
      audit(
        db,
        actor,
        existing ? "series.updated" : "series.created",
        "community_series",
        key,
      ),
    ],
    existing
      ? "EXISTS(SELECT 1 FROM community_series WHERE id=? AND version=?)"
      : "1",
    existing ? [key, version] : [],
  );
  return (await getSeries(db, key))!;
}
export async function savePhoto(
  db: D1Database,
  actor: EventAdmin,
  raw: unknown,
  id?: string,
  version?: number,
) {
  const existing = id ? await getPhoto(db, id) : null;
  if (id && !existing)
    throw new HttpError(404, "PHOTO_NOT_FOUND", "照片不存在。");
  const patch = existing
    ? parsePatch(photoInputSchema.omit({ mediaId: true }).partial(), raw)
    : null;
  if (existing && version !== existing.version)
    throw new HttpError(409, "VERSION_CONFLICT", "照片已更新，请刷新后重试。");
  const input = existing
    ? {
        alt: existing.alt,
        status: existing.status,
        seriesId: existing.seriesId,
        eventId: existing.eventId,
        sortOrder: existing.sortOrder,
        ...patch,
      }
    : parseContent(photoInputSchema, raw);
  await assertReferences(db, input.seriesId, input.eventId);
  const mediaId = existing
    ? existing.mediaId
    : (input as z.infer<typeof photoInputSchema>).mediaId;
  const media = mediaId ? await verifiedMedia(db, mediaId) : null;
  const key = existing?.id ?? crypto.randomUUID(),
    now = new Date().toISOString();
  const statement = existing
    ? db
        .prepare(
          "UPDATE community_photos SET alt=?,status=?,series_id=?,event_id=?,sort_order=?,version=version+1,updated_at=? WHERE id=?",
        )
        .bind(
          input.alt,
          input.status,
          input.seriesId,
          input.eventId,
          input.sortOrder,
          now,
          key,
        )
    : db
        .prepare(
          "INSERT INTO community_photos(id,alt,media_id,width,height,status,series_id,event_id,sort_order,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?)",
        )
        .bind(
          key,
          input.alt,
          mediaId,
          media!.width,
          media!.height,
          input.status,
          input.seriesId,
          input.eventId,
          input.sortOrder,
          now,
          now,
        );
  await guardedContentBatch(
    db,
    actor,
    [
      statement,
      audit(
        db,
        actor,
        existing ? "photo.updated" : "photo.created",
        "community_photo",
        key,
      ),
    ],
    existing
      ? "EXISTS(SELECT 1 FROM community_photos WHERE id=? AND version=?)"
      : "1",
    existing ? [key, version] : [],
  );
  return (await getPhoto(db, key))!;
}
export async function importLegacyPhotos(
  env: Pick<CloudflareEnv, "DB" | "MEDIA">,
  actor: EventAdmin,
) {
  const object = await env.MEDIA.get("photo-museum/v2/catalog.json");
  if (!object)
    throw new HttpError(503, "CATALOG_UNAVAILABLE", "历史照片目录暂时不可用。");
  const catalog = sanitizePhotoCatalog(await object.json());
  if (catalog.version !== "photo-museum/v2")
    throw new HttpError(422, "CATALOG_VERSION", "历史照片目录版本不匹配。");
  const now = new Date().toISOString();
  let imported = 0;
  for (let offset = 0; offset < catalog.photos.length; offset += 50) {
    const statements = catalog.photos
      .slice(offset, offset + 50)
      .map((photo) =>
        env.DB.prepare(
          "INSERT OR IGNORE INTO community_photos(id,alt,legacy_full_path,legacy_thumbnail_path,width,height,status,sort_order,created_at,updated_at) VALUES(?,?,?,?,?,?,'published',?,?,?)",
        ).bind(
          photo.id,
          photo.alt,
          `photo-museum/v2/${photo.fullPath}`,
          `photo-museum/v2/${photo.thumbnailPath}`,
          photo.width,
          photo.height,
          photo.displayOrder,
          now,
          now,
        ),
      );
    const results = await guardedContentBatch(env.DB, actor, statements);
    imported += results
      .slice(1, -1)
      .reduce((count, result) => count + result.meta.changes, 0);
  }
  await guardedContentBatch(env.DB, actor, [
    env.DB.prepare(
      "INSERT INTO community_imports(id,item_count,imported_at) VALUES('photo-museum/v2',?,?) ON CONFLICT(id) DO NOTHING",
    ).bind(catalog.photos.length, now),
    audit(
      env.DB,
      actor,
      "photo.legacy.imported",
      "community_photo",
      "photo-museum/v2",
    ),
  ]);
  return { imported, total: catalog.photos.length };
}
export async function saveEventSeries(
  db: D1Database,
  actor: EventAdmin,
  eventId: string,
  raw: unknown,
  version: number,
) {
  const input = parseContent(
    z.object({ seriesId: z.string().min(1).max(160).nullable() }).strict(),
    raw,
  );
  if (
    !(await db
      .prepare("SELECT 1 FROM event_details WHERE content_id=?")
      .bind(eventId)
      .first())
  )
    throw new HttpError(404, "EVENT_NOT_FOUND", "活动不存在。");
  await assertReferences(db, input.seriesId);
  const existing = await db
    .prepare("SELECT version FROM activity_series_memberships WHERE event_id=?")
    .bind(eventId)
    .first<{ version: number }>();
  if ((existing?.version ?? 0) !== version)
    throw new HttpError(
      409,
      "VERSION_CONFLICT",
      "活动栏目已更新，请刷新后重试。",
    );
  const statement = db
    .prepare(
      "INSERT INTO activity_series_memberships(event_id,series_id,version,updated_at) VALUES(?,?,1,?) ON CONFLICT(event_id) DO UPDATE SET series_id=excluded.series_id,version=activity_series_memberships.version+1,updated_at=excluded.updated_at",
    )
    .bind(eventId, input.seriesId, new Date().toISOString());
  await guardedContentBatch(
    db,
    actor,
    [statement, audit(db, actor, "event.series.updated", "event", eventId)],
    existing
      ? "EXISTS(SELECT 1 FROM activity_series_memberships WHERE event_id=? AND version=?)"
      : "NOT EXISTS(SELECT 1 FROM activity_series_memberships WHERE event_id=?)",
    existing ? [eventId, version] : [eventId],
  );
  return { eventId, seriesId: input.seriesId, version: version + 1 };
}
