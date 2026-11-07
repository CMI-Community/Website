import { z } from "zod";
import { handleEventAutofill } from "./event-autofill";
import {
  getEvent,
  getEventRevisions,
  getExternalEvent,
  listEvents,
} from "../app/modules/activities/event-repository.server";
import {
  getPublicEvent,
  listPublicEvents,
} from "../app/modules/activities/event-public";
import {
  eventEtag,
  eventInputSchema,
  EventValidationError,
  parseEventInput,
  type EventRecord,
} from "../app/modules/activities/event-schema";
import {
  readIdempotency,
  saveEvent,
  unpublishEvent,
  type EventMutationResult,
  type EventWriteOptions,
} from "../app/modules/activities/event-service.server";
import {
  adminMediaPreview,
  completeUnpublishBackups,
  uploadEventMedia,
} from "./event-media";
import {
  adminWriteGuard,
  assertIntegrationActive,
  authenticateIntegration,
  handleApiKeys,
  integrationWriteGuard,
  requireEventAdmin,
  requireEventScope,
  requirePermission,
  requireSameOrigin,
  sha256,
  type IntegrationKey,
} from "./integration-auth";
import {
  HttpError,
  isHttpError,
  json,
  methodNotAllowed,
  parseJson,
} from "./lib/http";

export function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  if (value && typeof value === "object")
    return `{${Object.keys(value)
      .sort()
      .map(
        (key) =>
          `${JSON.stringify(key)}:${canonicalJson((value as Record<string, unknown>)[key])}`,
      )
      .join(",")}}`;
  return JSON.stringify(value);
}

function expectedVersion(request: Request): number | undefined {
  const header = request.headers.get("if-match");
  if (!header) return undefined;
  const match = header.match(/^"v([1-9][0-9]*)"$/);
  if (!match || !Number.isSafeInteger(Number(match[1])))
    throw new HttpError(400, "INVALID_ETAG", "If-Match 必须是活动当前 ETag。");
  return Number(match[1]);
}

async function mutationResponse(
  env: CloudflareEnv,
  result: EventMutationResult,
): Promise<Response> {
  if (
    result.event.status === "unpublished" &&
    !(await completeUnpublishBackups(env, result.event.id))
  ) {
    return json(
      {
        error: {
          code: "BACKUP_PENDING",
          message: "活动和海报已隐藏，独立下架恢复记录保存失败，请重试完成。",
        },
        event: result.event,
        pendingBackupId: result.pendingBackupId,
      },
      { status: 503, headers: { ETag: result.etag } },
    );
  }
  return json(result, {
    status: result.status,
    headers: { ETag: result.etag },
  });
}

async function assertMediaScope(
  env: CloudflareEnv,
  key: IntegrationKey,
  mediaId: string,
  existing: EventRecord | null,
): Promise<void> {
  if (existing?.posterMediaId === mediaId) return;
  const media = await env.DB.prepare(
    "SELECT source,key_id FROM event_media WHERE media_id=?1",
  )
    .bind(mediaId)
    .first<{ source: string | null; key_id: string | null }>();
  if (
    !media ||
    (key.scope.type === "source"
      ? media.source !== key.source
      : media.key_id !== key.id)
  ) {
    throw new HttpError(
      403,
      "MEDIA_SCOPE_FORBIDDEN",
      "此海报不在密钥的授权范围内。",
    );
  }
}

async function integrationEndpoint(
  request: Request,
  env: CloudflareEnv,
  source: string,
  externalId: string | undefined,
  media: boolean,
): Promise<Response> {
  const key = await authenticateIntegration(request, env, source);
  const actor = {
    userId: key.userId,
    actorType: "integration" as const,
    source,
    keyId: key.id,
  };
  try {
    if (media) {
      requirePermission(key, "media:write");
      return await uploadEventMedia(request, env, actor, key);
    }
    if (!externalId) throw new HttpError(404, "NOT_FOUND", "接口不存在。");
    let existing = await getExternalEvent(env.DB, source, externalId);
    // An explicit-ID key addresses an existing manually created event by its ID.
    if (!existing && key.scope.type === "events")
      existing = await getEvent(env.DB, externalId);
    requireEventScope(key, existing?.id ?? null);
    if (request.method === "GET") {
      requirePermission(key, "events:read");
      if (!existing)
        throw new HttpError(404, "EVENT_NOT_FOUND", "活动不存在。");
      const mapping = await env.DB.prepare(
        "SELECT source_version FROM event_external_links WHERE source=?1 AND external_id=?2",
      )
        .bind(source, externalId)
        .first<{ source_version: number }>();
      return json(
        {
          event: {
            ...existing,
            externalId,
            sourceVersion: mapping?.source_version ?? null,
          },
        },
        { headers: { ETag: eventEtag(existing.version) } },
      );
    }
    if (!["PUT", "PATCH"].includes(request.method))
      return methodNotAllowed(["GET", "PUT", "PATCH"]);
    const raw = await parseJson(request);
    const bodySchema =
      request.method === "PUT"
        ? z
            .object({
              sourceVersion: z.number().int().positive(),
              event: z.unknown(),
            })
            .strict()
        : z
            .object({
              sourceVersion: z.number().int().positive(),
              status: z.literal("unpublished"),
            })
            .strict();
    const parsed = bodySchema.safeParse(raw);
    if (!parsed.success)
      throw new HttpError(
        422,
        "VALIDATION_ERROR",
        "请求必须包含递增的 sourceVersion 与完整活动或下架状态。",
      );
    const data = parsed.data;
    const event =
      request.method === "PUT"
        ? parseEventInput((data as { event: unknown }).event, { existing })
        : null;
    if (event) {
      requirePermission(key, "events:write");
      if (event.status === "published" || existing?.status === "published")
        requirePermission(key, "events:publish");
      if (
        event.status === "unpublished" ||
        (existing?.status === "published" && event.status !== "published")
      )
        requirePermission(key, "events:unpublish");
      await assertMediaScope(env, key, event.posterMediaId, existing);
    } else requirePermission(key, "events:unpublish");
    const idempotencyKey = request.headers.get("idempotency-key");
    if (!idempotencyKey || !/^[\w-]{8,128}$/.test(idempotencyKey))
      throw new HttpError(
        400,
        "IDEMPOTENCY_REQUIRED",
        "写入需提供 Idempotency-Key。",
      );
    const requestHash = await sha256(
      `${request.method}:${new URL(request.url).pathname}:${canonicalJson(raw)}`,
    );
    const previous = await readIdempotency(
      env.DB,
      key.id,
      idempotencyKey,
      requestHash,
    );
    if (previous) {
      await assertIntegrationActive(env, key);
      return mutationResponse(env, previous.body as EventMutationResult);
    }
    if (!existing && request.headers.get("if-none-match") !== "*")
      throw new HttpError(
        428,
        "PRECONDITION_REQUIRED",
        "新增活动需要 If-None-Match: *。",
      );
    const options: EventWriteOptions = {
      id: existing?.id,
      expectedVersion: expectedVersion(request),
      createOnly: request.headers.get("if-none-match") === "*",
      actor,
      guard: integrationWriteGuard(key),
      external: {
        source,
        externalId,
        sourceVersion: data.sourceVersion,
        requestHash,
      },
      idempotency: { keyId: key.id, key: idempotencyKey, requestHash },
    };
    if (event)
      return mutationResponse(env, await saveEvent(env.DB, event, options));
    if (!existing) throw new HttpError(404, "EVENT_NOT_FOUND", "活动不存在。");
    return mutationResponse(
      env,
      await unpublishEvent(env.DB, existing.id, options),
    );
  } catch (error) {
    await env.DB.prepare(
      "INSERT INTO audit_logs(id,actor_user_id,action,resource_type,resource_id,metadata_json) VALUES(?1,?2,'integration.request.rejected','event',?3,?4)",
    )
      .bind(
        crypto.randomUUID(),
        key.userId,
        externalId ?? null,
        JSON.stringify({
          actorType: "integration",
          source,
          keyId: key.id,
          result: isHttpError(error) ? error.code : "INTERNAL_ERROR",
          method: request.method,
        }),
      )
      .run();
    throw error;
  }
}

async function adminEvents(
  request: Request,
  env: CloudflareEnv,
  ctx: ExecutionContext,
  id?: string,
  action?: string,
): Promise<Response> {
  requireSameOrigin(request);
  const actor = await requireEventAdmin(request, env, ctx);
  if (action === "retry-unpublish") {
    if (request.method !== "POST") return methodNotAllowed(["POST"]);
    const event = await getEvent(env.DB, id!);
    if (!event || event.status !== "unpublished")
      throw new HttpError(409, "NOT_UNPUBLISHED", "活动当前不是已下架状态。");
    if (!(await completeUnpublishBackups(env, id!)))
      throw new HttpError(
        503,
        "BACKUP_PENDING",
        "独立下架恢复记录仍未保存，请稍后重试。",
      );
    return json({ ok: true, event });
  }
  if (action === "revisions") {
    if (request.method !== "GET") return methodNotAllowed(["GET"]);
    return json({ revisions: await getEventRevisions(env.DB, id!) });
  }
  if (action === "restore") {
    if (request.method !== "POST") return methodNotAllowed(["POST"]);
    const input = z
      .object({ revisionNumber: z.number().int().positive() })
      .strict()
      .safeParse(await parseJson(request));
    if (!input.success)
      throw new HttpError(422, "VALIDATION_ERROR", "请选择要恢复的修订版本。");
    const row = await env.DB.prepare(
      "SELECT snapshot_json FROM content_revisions WHERE content_id=?1 AND revision_number=?2",
    )
      .bind(id!, input.data.revisionNumber)
      .first<{ snapshot_json: string }>();
    if (!row)
      throw new HttpError(404, "REVISION_NOT_FOUND", "修订版本不存在。");
    const snapshot = JSON.parse(row.snapshot_json) as Record<string, unknown>;
    const draft = Object.fromEntries(
      Object.keys(eventInputSchema.shape).map((key) => [key, snapshot[key]]),
    );
    draft.status = "draft";
    return mutationResponse(
      env,
      await saveEvent(env.DB, draft, {
        id,
        actor,
        guard: adminWriteGuard(actor),
        expectedVersion: expectedVersion(request),
        restoredFromVersion: input.data.revisionNumber,
      }),
    );
  }
  if (request.method === "GET") {
    if (!id) return json({ events: await listEvents(env.DB) });
    const event = await getEvent(env.DB, id);
    if (!event) throw new HttpError(404, "EVENT_NOT_FOUND", "活动不存在。");
    return json({ event }, { headers: { ETag: eventEtag(event.version) } });
  }
  if (!id && request.method === "POST")
    return mutationResponse(
      env,
      await saveEvent(env.DB, await parseJson(request), {
        actor,
        guard: adminWriteGuard(actor),
        createOnly: true,
      }),
    );
  if (id && request.method === "PUT")
    return mutationResponse(
      env,
      await saveEvent(env.DB, await parseJson(request), {
        id,
        actor,
        guard: adminWriteGuard(actor),
        expectedVersion: expectedVersion(request),
      }),
    );
  if (id && request.method === "PATCH") {
    const input = z
      .object({ status: z.literal("unpublished") })
      .strict()
      .safeParse(await parseJson(request));
    if (!input.success)
      throw new HttpError(422, "VALIDATION_ERROR", "此接口仅接受下架操作。");
    return mutationResponse(
      env,
      await unpublishEvent(env.DB, id, {
        actor,
        guard: adminWriteGuard(actor),
        expectedVersion: expectedVersion(request),
      }),
    );
  }
  return methodNotAllowed(id ? ["GET", "PUT", "PATCH"] : ["GET", "POST"]);
}

export async function handleActivityApi(
  request: Request,
  env: CloudflareEnv,
  ctx: ExecutionContext,
): Promise<Response | null> {
  const path = new URL(request.url).pathname;
  if (
    !/^\/api\/v1\/(admin\/(events|media|api-keys|session)|integrations\/|events(?:\/|$))/.test(
      path,
    )
  )
    return null;
  const requestId = crypto.randomUUID();
  try {
    let response: Response;
    const integration = path.match(
      /^\/api\/v1\/integrations\/([a-z0-9][a-z0-9-]{1,63})\/(?:events\/([a-zA-Z0-9][a-zA-Z0-9_-]{0,159})|(media))$/,
    );
    const keys = path.match(
      /^\/api\/v1\/admin\/api-keys(?:\/([a-f0-9-]{36})\/revoke)?$/,
    );
    const events = path.match(
      /^\/api\/v1\/admin\/events(?:\/([a-zA-Z0-9-]{1,160})(?:\/(retry-unpublish|revisions|restore))?)?$/,
    );
    const preview = path.match(
      /^\/api\/v1\/admin\/media\/([a-zA-Z0-9-]{1,160})$/,
    );
    const publicMatch = path.match(
      /^\/api\/v1\/events(?:\/([a-zA-Z0-9-]{1,160}))?$/,
    );
    if (integration)
      response = await integrationEndpoint(
        request,
        env,
        integration[1],
        integration[2],
        Boolean(integration[3]),
      );
    else if (keys) response = await handleApiKeys(request, env, ctx, keys[1]);
    else if (path === "/api/v1/admin/events/autofill")
      response = await handleEventAutofill(request, env, ctx);
    else if (events)
      response = await adminEvents(request, env, ctx, events[1], events[2]);
    else if (path === "/api/v1/admin/media") {
      requireSameOrigin(request);
      const actor = await requireEventAdmin(request, env, ctx);
      response = await uploadEventMedia(request, env, actor);
    } else if (preview) {
      await requireEventAdmin(request, env, ctx);
      response = await adminMediaPreview(request, env, preview[1]);
    } else if (path === "/api/v1/admin/session") {
      if (request.method !== "GET") response = methodNotAllowed(["GET"]);
      else {
        const admin = await requireEventAdmin(request, env, ctx);
        response = json({
          user: { id: admin.userId, email: admin.email },
          otpVerifiedAt: admin.otpVerifiedAt,
        });
      }
    } else if (publicMatch) {
      if (request.method !== "GET") response = methodNotAllowed(["GET"]);
      else if (!publicMatch[1])
        response = json({ events: await listPublicEvents(env.DB) });
      else {
        const event = await getPublicEvent(env.DB, publicMatch[1]);
        if (!event) throw new HttpError(404, "EVENT_NOT_FOUND", "活动不存在。");
        response = json({ event });
      }
    } else throw new HttpError(404, "NOT_FOUND", "接口不存在。");
    if (
      response.status >= 400 &&
      response.headers.get("content-type")?.includes("application/json")
    ) {
      const payload = (await response.json()) as {
        error?: Record<string, unknown>;
      };
      if (payload.error) payload.error.requestId = requestId;
      response = json(payload, {
        status: response.status,
        headers: response.headers,
      });
    }
    response.headers.set("X-Request-Id", requestId);
    return response;
  } catch (error) {
    const status = isHttpError(error) ? error.status : 500;
    return json(
      {
        error: {
          code: isHttpError(error) ? error.code : "INTERNAL_ERROR",
          message: isHttpError(error)
            ? error.message
            : "操作未完成，请稍后重试。",
          ...(error instanceof EventValidationError
            ? { fields: error.fields }
            : {}),
          requestId,
        },
      },
      { status, headers: { "X-Request-Id": requestId } },
    );
  }
}
