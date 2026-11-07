import { z } from "zod";
import { createAuth, isEventAdminEmail } from "./auth";
import { HttpError, json, parseJson, methodNotAllowed } from "./lib/http";

export const EVENT_PERMISSIONS = [
  "events:read",
  "events:write",
  "events:publish",
  "events:unpublish",
  "media:write",
] as const;
export type EventPermission = (typeof EVENT_PERMISSIONS)[number];
export type KeyScope =
  { type: "source" } | { type: "events"; eventIds: string[] };
export interface IntegrationKey {
  id: string;
  source: string;
  permissions: EventPermission[];
  scope: KeyScope;
  userId: string;
  epoch: string;
  expiresAt: string;
  adminEmail?: string;
}
export interface EventAdmin {
  userId: string;
  actorType: "admin";
  sessionId: string;
  email: string;
  otpVerifiedAt: string;
  source?: never;
  keyId?: never;
}

const keyInput = z
  .object({
    name: z.string().trim().min(1).max(80),
    source: z.string().regex(/^[a-z0-9][a-z0-9-]{1,63}$/),
    permissions: z
      .array(z.enum(EVENT_PERMISSIONS))
      .min(1)
      .max(5)
      .default(["events:write", "media:write"]),
    scope: z
      .discriminatedUnion("type", [
        z.object({ type: z.literal("source") }).strict(),
        z
          .object({
            type: z.literal("events"),
            eventIds: z.array(z.string().min(1).max(120)).min(1).max(100),
          })
          .strict(),
      ])
      .default({ type: "source" }),
    expiresInDays: z.number().int().min(1).max(90).default(7),
  })
  .strict();

export function integrationEpoch(env: CloudflareEnv): string {
  const epoch =
    env.INTEGRATION_KEY_EPOCH ||
    (env.APP_ENV === "development" ? "local-v1" : "");
  if (!epoch)
    throw new HttpError(503, "KEY_EPOCH_REQUIRED", "API 授权尚未配置。");
  return epoch;
}

export async function sha256(value: string | ArrayBuffer): Promise<string> {
  const bytes =
    typeof value === "string" ? new TextEncoder().encode(value) : value;
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
}

export function requireSameOrigin(request: Request): void {
  if (["GET", "HEAD"].includes(request.method)) return;
  const origin = request.headers.get("origin");
  if (origin !== new URL(request.url).origin)
    throw new HttpError(403, "ORIGIN_REQUIRED", "请从活动管理页面提交操作。");
}

export async function requireEventAdmin(
  request: Request,
  env: CloudflareEnv,
  ctx: ExecutionContext,
  options: { recentOtp?: boolean } = {},
): Promise<EventAdmin> {
  const session = await createAuth(env, ctx).api.getSession({
    headers: request.headers,
    query: { disableCookieCache: true, disableRefresh: true },
  });
  if (!session?.user?.id || !session.user.emailVerified)
    throw new HttpError(401, "AUTH_REQUIRED", "请先使用邮箱验证码登录。");
  if (!isEventAdminEmail(env, session.user.email))
    throw new HttpError(403, "ADMIN_REQUIRED", "此账号没有活动管理权限。");
  const proof = await env.DB.prepare(
    `SELECT o.verified_at FROM event_admin_otp_sessions o
     JOIN auth_sessions s ON s.id=o.session_id JOIN auth_users u ON u.id=s.userId
     JOIN user_roles r ON r.user_id=u.id AND r.role='admin'
     WHERE s.id=?1 AND u.id=?2 AND u.emailVerified=1 AND lower(u.email)=?3`,
  )
    .bind(session.session.id, session.user.id, session.user.email.toLowerCase())
    .first<{ verified_at: string }>();
  if (
    !proof ||
    !Number.isFinite(Date.parse(proof.verified_at)) ||
    Date.parse(proof.verified_at) > Date.now() + 60_000
  )
    throw new HttpError(
      403,
      "OTP_REQUIRED",
      "请使用邮箱验证码重新登录活动后台。",
    );
  if (
    options.recentOtp &&
    Date.now() - Date.parse(proof.verified_at) > 10 * 60_000
  ) {
    throw new HttpError(
      403,
      "RECENT_OTP_REQUIRED",
      "签发密钥前，请在 10 分钟内重新完成验证码登录。",
    );
  }
  return {
    userId: session.user.id,
    actorType: "admin",
    sessionId: session.session.id,
    email: session.user.email,
    otpVerifiedAt: proof.verified_at,
  };
}

interface KeyRow {
  id: string;
  source: string;
  permissions_json: string;
  scope_json: string;
  created_by: string;
  epoch: string;
  expires_at: string;
  revoked_at: string | null;
}

export async function authenticateIntegration(
  request: Request,
  env: CloudflareEnv,
  source: string,
): Promise<IntegrationKey> {
  const authorization = request.headers.get("authorization") ?? "";
  if (!/^Bearer cmi_evt_[A-Za-z0-9_-]{43}$/.test(authorization))
    throw new HttpError(401, "INVALID_TOKEN", "API 密钥无效或已失效。");
  const row = await env.DB.prepare(
    `SELECT k.* FROM integration_api_keys k JOIN auth_users u ON u.id=k.created_by
     JOIN user_roles r ON r.user_id=u.id AND r.role='admin'
     WHERE k.token_hash=?1 AND lower(u.email)=?2 AND u.emailVerified=1`,
  )
    .bind(
      await sha256(authorization.slice(7)),
      env.EVENT_ADMIN_EMAIL?.trim().toLowerCase() ?? "",
    )
    .first<KeyRow>();
  if (
    !row ||
    row.revoked_at ||
    Date.parse(row.expires_at) <= Date.now() ||
    row.epoch !== integrationEpoch(env)
  ) {
    throw new HttpError(401, "INVALID_TOKEN", "API 密钥无效或已失效。");
  }
  if (row.source !== source)
    throw new HttpError(403, "SOURCE_FORBIDDEN", "密钥不能访问此来源。");
  return {
    id: row.id,
    source: row.source,
    userId: row.created_by,
    permissions: JSON.parse(row.permissions_json),
    scope: JSON.parse(row.scope_json),
    epoch: row.epoch,
    expiresAt: row.expires_at,
    adminEmail: env.EVENT_ADMIN_EMAIL!.trim().toLowerCase(),
  };
}

export function requirePermission(
  key: IntegrationKey,
  permission: EventPermission,
): void {
  if (!key.permissions.includes(permission))
    throw new HttpError(403, "PERMISSION_DENIED", "此密钥没有所需权限。");
}

export function requireEventScope(
  key: IntegrationKey,
  eventId: string | null,
): void {
  if (
    key.scope.type === "events" &&
    (!eventId || !key.scope.eventIds.includes(eventId))
  ) {
    throw new HttpError(403, "SCOPE_FORBIDDEN", "此活动不在授权范围内。");
  }
}

export function integrationWriteGuard(key: IntegrationKey) {
  return {
    sql: `EXISTS(SELECT 1 FROM integration_api_keys k JOIN auth_users u ON u.id=k.created_by
       JOIN user_roles r ON r.user_id=u.id AND r.role='admin'
       WHERE k.id=? AND k.revoked_at IS NULL AND k.expires_at>strftime('%Y-%m-%dT%H:%M:%fZ','now')
         AND k.epoch=? AND u.emailVerified=1 AND lower(u.email)=?)`,
    bindings: [key.id, key.epoch, key.adminEmail ?? ""],
  };
}

export async function assertIntegrationActive(
  env: CloudflareEnv,
  key: IntegrationKey,
): Promise<void> {
  const guard = integrationWriteGuard(key);
  const active = await env.DB.prepare(`SELECT 1 WHERE ${guard.sql}`)
    .bind(...guard.bindings)
    .first();
  if (!active || key.epoch !== integrationEpoch(env))
    throw new HttpError(
      403,
      "AUTHORIZATION_CHANGED",
      "授权已失效，操作未完成。",
    );
}

export function adminWriteGuard(admin: EventAdmin, recentOtp = false) {
  return {
    sql: `EXISTS(SELECT 1 FROM auth_sessions s JOIN auth_users u ON u.id=s.userId
      JOIN user_roles r ON r.user_id=u.id AND r.role='admin'
      JOIN event_admin_otp_sessions o ON o.session_id=s.id
      WHERE s.id=? AND u.id=? AND lower(u.email)=? AND u.emailVerified=1
      AND (CASE WHEN typeof(s.expiresAt) IN ('integer','real')
        THEN CASE WHEN s.expiresAt>100000000000 THEN s.expiresAt/1000 ELSE s.expiresAt END
        ELSE unixepoch(s.expiresAt) END)>unixepoch()
      AND unixepoch(o.verified_at)>0 AND unixepoch(o.verified_at)<=unixepoch()+60
      ${recentOtp ? "AND unixepoch(o.verified_at)>unixepoch()-600" : ""})`,
    bindings: [admin.sessionId, admin.userId, admin.email.toLowerCase()],
  };
}

function adminAssertion(
  env: CloudflareEnv,
  admin: EventAdmin,
  id: string,
  recentOtp = false,
) {
  const guard = adminWriteGuard(admin, recentOtp);
  return env.DB.prepare(
    `INSERT INTO event_write_assertions(id,passed) SELECT ?,CASE WHEN ${guard.sql} THEN 1 ELSE 0 END`,
  ).bind(id, ...guard.bindings);
}

export function parseKeyInput(raw: unknown) {
  const parsed = keyInput.safeParse(raw);
  if (!parsed.success)
    throw new HttpError(
      400,
      "VALIDATION_ERROR",
      "请检查授权名称、来源、权限、范围和有效期。",
    );
  return parsed.data;
}

export async function handleApiKeys(
  request: Request,
  env: CloudflareEnv,
  ctx: ExecutionContext,
  keyId?: string,
): Promise<Response> {
  requireSameOrigin(request);
  const admin = await requireEventAdmin(request, env, ctx, {
    recentOtp: request.method === "POST" && !keyId,
  });
  if (keyId) {
    if (request.method !== "POST") return methodNotAllowed(["POST"]);
    const now = new Date().toISOString();
    const exists = await env.DB.prepare(
      "SELECT id FROM integration_api_keys WHERE id=?1",
    )
      .bind(keyId)
      .first();
    if (!exists) throw new HttpError(404, "KEY_NOT_FOUND", "授权不存在。");
    const assertion = crypto.randomUUID();
    await env.DB.batch([
      adminAssertion(env, admin, assertion),
      env.DB.prepare(
        "UPDATE integration_api_keys SET revoked_at=COALESCE(revoked_at,?2) WHERE id=?1",
      ).bind(keyId, now),
      env.DB.prepare(
        "INSERT INTO audit_logs(id,actor_user_id,action,resource_type,resource_id) VALUES(?1,?2,'integration.key.revoked','api_key',?3)",
      ).bind(crypto.randomUUID(), admin.userId, keyId),
      env.DB.prepare("DELETE FROM event_write_assertions WHERE id=?1").bind(
        assertion,
      ),
    ]);
    return json({ ok: true });
  }
  if (request.method === "GET") {
    const rows = await env.DB.prepare(
      `SELECT id,name,token_prefix AS tokenPrefix,source,permissions_json,scope_json,
      created_at AS createdAt,expires_at AS expiresAt,revoked_at AS revokedAt FROM integration_api_keys ORDER BY created_at DESC LIMIT 200`,
    ).all<{ permissions_json: string; scope_json: string }>();
    return json({
      keys: rows.results.map(({ permissions_json, scope_json, ...row }) => ({
        ...row,
        permissions: JSON.parse(permissions_json),
        scope: JSON.parse(scope_json),
      })),
    });
  }
  if (request.method !== "POST") return methodNotAllowed(["GET", "POST"]);
  const input = parseKeyInput(await parseJson(request));
  if (input.scope.type === "events") {
    for (const id of input.scope.eventIds) {
      if (
        !(await env.DB.prepare(
          "SELECT content_id FROM event_details WHERE content_id=?1",
        )
          .bind(id)
          .first())
      ) {
        throw new HttpError(400, "INVALID_SCOPE", "授权范围包含不存在的活动。");
      }
    }
  }
  const random = crypto.getRandomValues(new Uint8Array(32));
  const token = `cmi_evt_${btoa(String.fromCharCode(...random))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "")}`;
  const now = new Date().toISOString();
  const key = {
    id: crypto.randomUUID(),
    name: input.name,
    tokenPrefix: token.slice(0, 16),
    source: input.source,
    permissions: [...new Set(input.permissions)],
    scope: input.scope,
    createdAt: now,
    expiresAt: new Date(
      Date.now() + input.expiresInDays * 86_400_000,
    ).toISOString(),
    revokedAt: null,
  };
  const assertion = crypto.randomUUID();
  await env.DB.batch([
    adminAssertion(env, admin, assertion, true),
    env.DB.prepare(
      `INSERT INTO integration_api_keys(id,name,token_hash,token_prefix,source,permissions_json,scope_json,epoch,created_by,created_at,expires_at)
      VALUES(?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11)`,
    ).bind(
      key.id,
      key.name,
      await sha256(token),
      key.tokenPrefix,
      key.source,
      JSON.stringify(key.permissions),
      JSON.stringify(key.scope),
      integrationEpoch(env),
      admin.userId,
      now,
      key.expiresAt,
    ),
    env.DB.prepare(
      "INSERT INTO audit_logs(id,actor_user_id,action,resource_type,resource_id,metadata_json) VALUES(?1,?2,'integration.key.created','api_key',?3,?4)",
    ).bind(
      crypto.randomUUID(),
      admin.userId,
      key.id,
      JSON.stringify({
        source: key.source,
        permissions: key.permissions,
        scope: key.scope,
      }),
    ),
    env.DB.prepare("DELETE FROM event_write_assertions WHERE id=?1").bind(
      assertion,
    ),
  ]);
  return json({ key, token }, { status: 201 });
}
