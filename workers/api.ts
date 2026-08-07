import { z } from "zod";
import { editorContent, publicContent, type ContentRow } from "../app/modules/publishing/public-content";
import { hasMinimumRole, isRole, type Role } from "../app/shared/auth/roles";
import { createAuth } from "./auth";
import { apiError, HttpError, isHttpError, json, methodNotAllowed, parseJson } from "./lib/http";

interface Actor {
  id: string;
  email: string;
  name: string;
  roles: Role[];
}

const profileInput = z
  .object({
    displayName: z.string().trim().min(1).max(80).optional(),
    handle: z
      .string()
      .trim()
      .toLowerCase()
      .regex(/^[a-z0-9][a-z0-9_-]{2,31}$/)
      .nullable()
      .optional(),
    bio: z.string().trim().max(500).nullable().optional(),
    locale: z.enum(["zh-CN", "en"]).optional(),
    visibility: z.enum(["private", "members", "public"]).optional(),
  })
  .strict();

const invitationInput = z
  .object({
    email: z.email().transform((value) => value.trim().toLowerCase()),
    role: z.enum(["member", "editor", "moderator", "admin"]).default("member"),
    expiresInDays: z.number().int().min(1).max(90).default(14),
  })
  .strict();

const contentInput = z
  .object({
    type: z.enum(["page", "story", "event", "memory", "experiment"]),
    locale: z.enum(["zh-CN", "en"]).default("zh-CN"),
    slug: z
      .string()
      .trim()
      .min(1)
      .max(120)
      .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
    title: z.string().trim().min(1).max(160),
    summary: z.string().trim().max(500).nullable().default(null),
    body: z.string().max(200_000).default(""),
    metadata: z.record(z.string(), z.unknown()).default({}),
  })
  .strict();

const contentUpdateInput = contentInput.partial().strict();

const mediaInput = z
  .object({
    filename: z.string().trim().min(1).max(180),
    mimeType: z.enum([
      "image/jpeg",
      "image/png",
      "image/webp",
      "image/gif",
      "application/pdf",
    ]),
    byteSize: z.number().int().min(1).max(25 * 1024 * 1024),
    altText: z.string().trim().max(300).default(""),
  })
  .strict();

function validationError(error: z.ZodError): Response {
  return apiError(400, "VALIDATION_ERROR", error.issues[0]?.message ?? "请求字段无效。");
}

async function getActor(request: Request, env: CloudflareEnv, ctx: ExecutionContext): Promise<Actor> {
  const session = await createAuth(env, ctx).api.getSession({ headers: request.headers });
  if (!session?.user?.id || !session.user.emailVerified) {
    throw new HttpError(401, "AUTH_REQUIRED", "请先完成邮箱验证并登录。");
  }

  const rows = await env.DB.prepare("SELECT role FROM user_roles WHERE user_id = ?1")
    .bind(session.user.id)
    .all<{ role: string }>();
  const roles = (rows.results ?? []).map((row) => row.role).filter(isRole);
  return {
    id: session.user.id,
    email: session.user.email,
    name: session.user.name,
    roles: roles.length ? roles : ["member"],
  };
}

async function requireRole(
  request: Request,
  env: CloudflareEnv,
  ctx: ExecutionContext,
  role: Role,
): Promise<Actor> {
  const actor = await getActor(request, env, ctx);
  if (!hasMinimumRole(actor.roles, role)) {
    throw new HttpError(403, "INSUFFICIENT_ROLE", `此操作需要 ${role} 权限。`);
  }
  return actor;
}

function audit(
  env: CloudflareEnv,
  actorId: string,
  action: string,
  resourceType: string,
  resourceId: string | null,
  metadata: Record<string, unknown> = {},
) {
  return env.DB.prepare(
    `INSERT INTO audit_logs
      (id, actor_user_id, action, resource_type, resource_id, metadata_json)
     VALUES (?1, ?2, ?3, ?4, ?5, ?6)`,
  ).bind(
    crypto.randomUUID(),
    actorId,
    action,
    resourceType,
    resourceId,
    JSON.stringify(metadata),
  );
}

async function handleMe(request: Request, env: CloudflareEnv, ctx: ExecutionContext) {
  const actor = await getActor(request, env, ctx);
  if (request.method === "GET") {
    const profile = await env.DB.prepare(
      `SELECT display_name AS displayName, handle, bio, locale, visibility,
              created_at AS createdAt, updated_at AS updatedAt
         FROM profiles WHERE user_id = ?1`,
    )
      .bind(actor.id)
      .first();
    return json({ user: { id: actor.id, email: actor.email, name: actor.name, roles: actor.roles }, profile });
  }
  if (request.method !== "PATCH") return methodNotAllowed(["GET", "PATCH"]);

  const parsed = profileInput.safeParse(await parseJson(request));
  if (!parsed.success) return validationError(parsed.error);
  const current = await env.DB.prepare("SELECT * FROM profiles WHERE user_id = ?1")
    .bind(actor.id)
    .first<Record<string, unknown>>();
  if (!current) throw new HttpError(404, "PROFILE_NOT_FOUND", "用户资料尚未建立。");

  const next = {
    displayName: parsed.data.displayName ?? current.display_name,
    handle: parsed.data.handle === undefined ? current.handle : parsed.data.handle,
    bio: parsed.data.bio === undefined ? current.bio : parsed.data.bio,
    locale: parsed.data.locale ?? current.locale,
    visibility: parsed.data.visibility ?? current.visibility,
  };
  await env.DB.batch([
    env.DB.prepare(
      `UPDATE profiles
          SET display_name = ?2, handle = ?3, bio = ?4, locale = ?5,
              visibility = ?6, updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
        WHERE user_id = ?1`,
    ).bind(actor.id, next.displayName, next.handle, next.bio, next.locale, next.visibility),
    audit(env, actor.id, "profile.updated", "profile", actor.id),
  ]);
  return json({ ok: true });
}

async function handleInvitations(request: Request, env: CloudflareEnv, ctx: ExecutionContext) {
  const actor = await requireRole(request, env, ctx, "admin");
  if (request.method === "GET") {
    const rows = await env.DB.prepare(
      `SELECT id, email, role, expires_at AS expiresAt, accepted_at AS acceptedAt,
              revoked_at AS revokedAt, created_at AS createdAt
         FROM invitations ORDER BY created_at DESC LIMIT 200`,
    ).all();
    return json({ invitations: rows.results ?? [] });
  }
  if (request.method !== "POST") return methodNotAllowed(["GET", "POST"]);

  const parsed = invitationInput.safeParse(await parseJson(request));
  if (!parsed.success) return validationError(parsed.error);
  const id = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + parsed.data.expiresInDays * 86_400_000).toISOString();
  await env.DB.batch([
    env.DB.prepare(
      `INSERT INTO invitations (id, email, role, invited_by, expires_at)
       VALUES (?1, ?2, ?3, ?4, ?5)`,
    ).bind(id, parsed.data.email, parsed.data.role, actor.id, expiresAt),
    audit(env, actor.id, "invitation.created", "invitation", id, { role: parsed.data.role }),
  ]);
  return json({ invitation: { id, email: parsed.data.email, role: parsed.data.role, expiresAt } }, { status: 201 });
}

async function handleContentCollection(
  request: Request,
  url: URL,
  env: CloudflareEnv,
  ctx: ExecutionContext,
) {
  if (request.method === "GET") {
    const locale = url.searchParams.get("locale") === "en" ? "en" : "zh-CN";
    const includeDrafts = url.searchParams.get("status") === "draft";
    if (includeDrafts) await requireRole(request, env, ctx, "editor");
    const query = includeDrafts
      ? `SELECT * FROM content_entries WHERE locale = ?1 ORDER BY updated_at DESC LIMIT 100`
      : `SELECT * FROM content_entries
          WHERE locale = ?1 AND status = 'published'
          ORDER BY published_at DESC LIMIT 100`;
    const rows = await env.DB.prepare(query).bind(locale).all<ContentRow>();
    return json({
      content: (rows.results ?? []).map(includeDrafts ? editorContent : publicContent),
    });
  }
  if (request.method !== "POST") return methodNotAllowed(["GET", "POST"]);
  const actor = await requireRole(request, env, ctx, "editor");
  const parsed = contentInput.safeParse(await parseJson(request));
  if (!parsed.success) return validationError(parsed.error);
  const id = crypto.randomUUID();
  const data = parsed.data;
  await env.DB.batch([
    env.DB.prepare(
      `INSERT INTO content_entries
        (id, type, locale, slug, title, summary, body_md, metadata_json, created_by, updated_by)
       VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?9)`,
    ).bind(
      id,
      data.type,
      data.locale,
      data.slug,
      data.title,
      data.summary,
      data.body,
      JSON.stringify(data.metadata),
      actor.id,
    ),
    audit(env, actor.id, "content.created", "content", id),
  ]);
  return json({ content: { id, ...data, status: "draft" } }, { status: 201 });
}

async function handleContentItem(
  request: Request,
  id: string,
  env: CloudflareEnv,
  ctx: ExecutionContext,
) {
  if (request.method === "GET") {
    const row = await env.DB.prepare("SELECT * FROM content_entries WHERE id = ?1")
      .bind(id)
      .first<ContentRow>();
    if (!row) throw new HttpError(404, "CONTENT_NOT_FOUND", "内容不存在。");
    if (row.status !== "published") await requireRole(request, env, ctx, "editor");
    return json({ content: row.status === "published" ? publicContent(row) : editorContent(row) });
  }
  if (request.method !== "PATCH") return methodNotAllowed(["GET", "PATCH"]);
  const actor = await requireRole(request, env, ctx, "editor");
  const parsed = contentUpdateInput.safeParse(await parseJson(request));
  if (!parsed.success) return validationError(parsed.error);
  const current = await env.DB.prepare("SELECT * FROM content_entries WHERE id = ?1")
    .bind(id)
    .first<ContentRow>();
  if (!current) throw new HttpError(404, "CONTENT_NOT_FOUND", "内容不存在。");
  const data = parsed.data;
  const next = {
    type: data.type ?? current.type,
    locale: data.locale ?? current.locale,
    slug: data.slug ?? current.slug,
    title: data.title ?? current.title,
    summary: data.summary === undefined ? current.summary : data.summary,
    body: data.body ?? current.body_md,
    metadata: data.metadata ?? JSON.parse(current.metadata_json),
  };
  await env.DB.batch([
    env.DB.prepare(
      `UPDATE content_entries
          SET type = ?2, locale = ?3, slug = ?4, title = ?5, summary = ?6,
              body_md = ?7, metadata_json = ?8, updated_by = ?9,
              updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
        WHERE id = ?1`,
    ).bind(
      id,
      next.type,
      next.locale,
      next.slug,
      next.title,
      next.summary,
      next.body,
      JSON.stringify(next.metadata),
      actor.id,
    ),
    audit(env, actor.id, "content.updated", "content", id),
  ]);
  return json({ content: { id, ...next, status: current.status } });
}

async function handlePublish(request: Request, id: string, env: CloudflareEnv, ctx: ExecutionContext) {
  if (request.method !== "POST") return methodNotAllowed(["POST"]);
  const actor = await requireRole(request, env, ctx, "admin");
  const current = await env.DB.prepare("SELECT * FROM content_entries WHERE id = ?1")
    .bind(id)
    .first<ContentRow>();
  if (!current) throw new HttpError(404, "CONTENT_NOT_FOUND", "内容不存在。");
  const revision = await env.DB.prepare(
    `SELECT COALESCE(MAX(revision_number), 0) + 1 AS next
       FROM content_revisions WHERE content_id = ?1`,
  )
    .bind(id)
    .first<{ next: number }>();
  const now = new Date().toISOString();
  const revisionId = crypto.randomUUID();
  await env.DB.batch([
    env.DB.prepare(
      `INSERT INTO content_revisions
        (id, content_id, revision_number, snapshot_json, created_by)
       VALUES (?1, ?2, ?3, ?4, ?5)`,
    ).bind(revisionId, id, revision?.next ?? 1, JSON.stringify(current), actor.id),
    env.DB.prepare(
      `UPDATE content_entries
          SET status = 'published', published_at = ?2, published_by = ?3,
              updated_at = ?2, updated_by = ?3
        WHERE id = ?1`,
    ).bind(id, now, actor.id),
    audit(env, actor.id, "content.published", "content", id, { revisionId }),
  ]);
  return json({ content: { id, status: "published", publishedAt: now }, revisionId });
}

function safeFilename(value: string): string {
  const ext = value.toLowerCase().match(/\.[a-z0-9]{1,8}$/)?.[0] ?? "";
  const stem = value
    .slice(0, ext ? -ext.length : undefined)
    .normalize("NFKD")
    .replace(/[^a-zA-Z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64);
  return `${stem || "asset"}${ext}`;
}

async function handleMedia(
  request: Request,
  pathId: string | null,
  env: CloudflareEnv,
  ctx: ExecutionContext,
) {
  const actor = await requireRole(request, env, ctx, "editor");
  if (!pathId && request.method === "POST") {
    const parsed = mediaInput.safeParse(await parseJson(request));
    if (!parsed.success) return validationError(parsed.error);
    const id = crypto.randomUUID();
    const date = new Date();
    const key = `uploads/${date.getUTCFullYear()}/${String(date.getUTCMonth() + 1).padStart(2, "0")}/${id}-${safeFilename(parsed.data.filename)}`;
    await env.DB.batch([
      env.DB.prepare(
        `INSERT INTO media_assets
          (id, object_key, mime_type, byte_size, alt_text, created_by)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6)`,
      ).bind(id, key, parsed.data.mimeType, parsed.data.byteSize, parsed.data.altText, actor.id),
      audit(env, actor.id, "media.registered", "media", id, { mimeType: parsed.data.mimeType }),
    ]);
    return json(
      { media: { id, key, status: "pending", uploadUrl: `/api/v1/media/${id}/content` } },
      { status: 201 },
    );
  }

  if (pathId && request.method === "PUT") {
    const row = await env.DB.prepare(
      `SELECT id, object_key AS objectKey, mime_type AS mimeType, byte_size AS byteSize
         FROM media_assets WHERE id = ?1 AND status = 'pending'`,
    )
      .bind(pathId)
      .first<{ id: string; objectKey: string; mimeType: string; byteSize: number }>();
    if (!row) throw new HttpError(404, "MEDIA_NOT_FOUND", "待上传媒体不存在。");
    const length = Number(request.headers.get("content-length"));
    const mimeType = request.headers.get("content-type")?.split(";")[0];
    if (length !== row.byteSize || mimeType !== row.mimeType || !request.body) {
      throw new HttpError(400, "MEDIA_MISMATCH", "上传大小或类型与登记信息不一致。");
    }
    await env.MEDIA.put(row.objectKey, request.body, {
      httpMetadata: { contentType: row.mimeType, cacheControl: "public, max-age=31536000, immutable" },
      customMetadata: { assetId: row.id, uploadedBy: actor.id },
    });
    await env.DB.batch([
      env.DB.prepare(
        `UPDATE media_assets
            SET status = 'ready', updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
          WHERE id = ?1`,
      ).bind(row.id),
      audit(env, actor.id, "media.uploaded", "media", row.id),
    ]);
    return json({ media: { id: row.id, status: "ready", url: `${env.ASSET_BASE_URL}/${row.objectKey}` } });
  }
  return methodNotAllowed(pathId ? ["PUT"] : ["POST"]);
}

async function handlePosterCatalog(env: CloudflareEnv) {
  const object = await env.MEDIA.get("poster-wall/v1/catalog.json");
  if (!object) {
    throw new HttpError(503, "POSTER_CATALOG_UNAVAILABLE", "海报目录暂时不可用，请稍后刷新。");
  }
  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set("Content-Type", "application/json; charset=utf-8");
  headers.set("Cache-Control", "public, max-age=300, stale-while-revalidate=86400");
  headers.set("X-Content-Type-Options", "nosniff");
  return new Response(object.body, { headers });
}

export async function handleV1Api(
  request: Request,
  env: CloudflareEnv,
  ctx: ExecutionContext,
): Promise<Response> {
  const url = new URL(request.url);
  try {
    if (url.pathname === "/api/v1/health" && request.method === "GET") {
      return json({ ok: true, service: "cmi-community-platform", environment: env.APP_ENV });
    }
    if (url.pathname === "/api/v1/posters" && request.method === "GET") {
      return await handlePosterCatalog(env);
    }
    if (url.pathname === "/api/v1/me") return await handleMe(request, env, ctx);
    if (url.pathname === "/api/v1/invitations") return await handleInvitations(request, env, ctx);
    if (url.pathname === "/api/v1/content") return await handleContentCollection(request, url, env, ctx);
    if (url.pathname === "/api/v1/media") return await handleMedia(request, null, env, ctx);

    const mediaMatch = url.pathname.match(/^\/api\/v1\/media\/([0-9a-f-]{36})\/content$/i);
    if (mediaMatch) return await handleMedia(request, mediaMatch[1], env, ctx);
    const publishMatch = url.pathname.match(/^\/api\/v1\/content\/([0-9a-f-]{36})\/publish$/i);
    if (publishMatch) return await handlePublish(request, publishMatch[1], env, ctx);
    const contentMatch = url.pathname.match(/^\/api\/v1\/content\/([0-9a-f-]{36})$/i);
    if (contentMatch) return await handleContentItem(request, contentMatch[1], env, ctx);

    return apiError(404, "NOT_FOUND", "接口不存在。");
  } catch (error) {
    if (isHttpError(error)) return apiError(error.status, error.code, error.message);
    console.error("API request failed", { path: url.pathname, error });
    return apiError(500, "INTERNAL_ERROR", "服务暂时不可用，请稍后再试。");
  }
}
