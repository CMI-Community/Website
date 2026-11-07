import { HttpError } from "../../../workers/lib/http";
import {
  bangkokDate,
  eventEtag,
  parseEventInput,
  type EventActor,
  type EventInput,
  type EventRecord,
} from "./event-schema";
import { getEvent } from "./event-repository.server";

export interface AtomicGuard {
  sql: string;
  bindings: (string | number | null)[];
}
export interface EventWriteOptions {
  id?: string;
  expectedVersion?: number;
  createOnly?: boolean;
  restoredFromVersion?: number;
  actor: EventActor;
  guard?: AtomicGuard;
  external?: {
    source: string;
    externalId: string;
    sourceVersion: number;
    requestHash: string;
  };
  idempotency?: { keyId: string; key: string; requestHash: string };
}
export interface EventMutationResult {
  status: number;
  result: "created" | "updated" | "unpublished";
  event: EventRecord;
  etag: string;
  replayed?: boolean;
  pendingBackupId?: string;
}
export interface StoredIdempotency {
  statusCode: number;
  body: unknown;
  etag: string | null;
}
export async function readIdempotency(
  db: D1Database,
  keyId: string,
  key: string,
  requestHash: string,
): Promise<StoredIdempotency | null> {
  const row = await db
    .prepare(
      "SELECT request_hash,status_code,response_json,etag,expires_at FROM integration_requests WHERE key_id=? AND idempotency_key=?",
    )
    .bind(keyId, key)
    .first<{
      request_hash: string;
      status_code: number;
      response_json: string;
      etag: string | null;
      expires_at: string;
    }>();
  if (!row || row.expires_at <= new Date().toISOString()) return null;
  if (row.request_hash !== requestHash)
    throw new HttpError(
      409,
      "IDEMPOTENCY_CONFLICT",
      "相同幂等键不能用于不同请求。",
    );
  return {
    statusCode: row.status_code,
    body: JSON.parse(row.response_json),
    etag: row.etag,
  };
}
function assertStatement(
  db: D1Database,
  id: string,
  condition: string,
  values: unknown[],
): D1PreparedStatement {
  return db
    .prepare(
      `INSERT INTO event_write_assertions(id,passed) SELECT ?,CASE WHEN (${condition}) THEN 1 ELSE 0 END`,
    )
    .bind(id, ...values);
}
async function checkGuard(db: D1Database, guard?: AtomicGuard): Promise<void> {
  if (!guard) return;
  const row = await db
    .prepare(`SELECT CASE WHEN (${guard.sql}) THEN 1 ELSE 0 END AS ok`)
    .bind(...guard.bindings)
    .first<{ ok: number }>();
  if (!row?.ok)
    throw new HttpError(
      403,
      "AUTHORIZATION_CHANGED",
      "授权已失效，操作未写入。",
    );
}
export async function saveEvent(
  db: D1Database,
  raw: unknown,
  options: EventWriteOptions,
): Promise<EventMutationResult> {
  const { actor, external, idempotency, guard } = options;
  await checkGuard(db, guard);
  if (idempotency) {
    const replay = await readIdempotency(
      db,
      idempotency.keyId,
      idempotency.key,
      idempotency.requestHash,
    );
    if (replay) {
      await checkGuard(db, guard);
      return { ...(replay.body as EventMutationResult), replayed: true };
    }
  }
  let mapping: {
    event_id: string;
    source_version: number;
    request_hash: string;
    response_json: string;
  } | null = null;
  if (external) {
    if (
      !Number.isSafeInteger(external.sourceVersion) ||
      external.sourceVersion < 1
    )
      throw new HttpError(
        422,
        "VALIDATION_ERROR",
        "sourceVersion 必须是正整数。",
      );
    mapping = await db
      .prepare(
        "SELECT event_id,source_version,request_hash,response_json FROM event_external_links WHERE source=? AND external_id=?",
      )
      .bind(external.source, external.externalId)
      .first();
    if (mapping && external.sourceVersion <= mapping.source_version) {
      if (
        external.sourceVersion === mapping.source_version &&
        external.requestHash === mapping.request_hash
      ) {
        await checkGuard(db, guard);
        return {
          ...(JSON.parse(mapping.response_json) as EventMutationResult),
          replayed: true,
        };
      }
      throw new HttpError(
        409,
        "SOURCE_VERSION_CONFLICT",
        "来源版本已过期或与已有内容冲突。",
      );
    }
    if (mapping && options.id && options.id !== mapping.event_id)
      throw new HttpError(
        409,
        "EXTERNAL_ID_CONFLICT",
        "外部编号已经关联另一场活动。",
      );
  }
  const id = mapping?.event_id ?? options.id ?? crypto.randomUUID();
  const existing = await getEvent(db, id);
  if (existing && options.createOnly)
    throw new HttpError(
      412,
      "PRECONDITION_FAILED",
      "活动已存在，请读取当前版本后编辑。",
    );
  if (existing && options.expectedVersion === undefined)
    throw new HttpError(
      428,
      "PRECONDITION_REQUIRED",
      "编辑活动需要提供当前 ETag。",
    );
  if (existing && existing.version !== options.expectedVersion)
    throw new HttpError(
      412,
      "PRECONDITION_FAILED",
      "活动已被其他操作修改，请重新读取。",
    );
  if (!existing && options.expectedVersion !== undefined)
    throw new HttpError(412, "PRECONDITION_FAILED", "活动不存在或已变更。");
  const input = parseEventInput(raw, { existing });
  if (existing?.status === "published" && input.status === "draft") {
    throw new HttpError(
      409,
      "UNPUBLISH_FIRST",
      "已公开活动请先下架并保存独立恢复记录，再编辑为草稿或恢复旧版本。",
    );
  }
  if (input.status === "published") {
    const pending = await db
      .prepare(
        "SELECT id FROM event_unpublish_records WHERE event_id=? AND status='pending' LIMIT 1",
      )
      .bind(id)
      .first();
    if (pending)
      throw new HttpError(
        409,
        "UNPUBLISH_BACKUP_PENDING",
        "请先重试保存独立下架恢复记录，再重新发布。",
      );
  }
  const media = await db
    .prepare(
      "SELECT m.width,m.height FROM event_media m JOIN media_assets a ON a.id=m.media_id WHERE m.media_id=? AND a.status='ready' AND m.storage='private' AND m.verified_at IS NOT NULL",
    )
    .bind(input.posterMediaId)
    .first<{ width: number; height: number }>();
  // Unpublishing must remain possible even when media is quarantined or a migration copy is pending.
  if (!media && input.status !== "unpublished")
    throw new HttpError(422, "MEDIA_NOT_READY", "请先上传并验证活动海报。");
  const mediaOwner = await db
    .prepare(
      "SELECT content_id FROM event_details WHERE poster_media_id=? AND content_id<>?",
    )
    .bind(input.posterMediaId, id)
    .first<{ content_id: string }>();
  if (mediaOwner)
    throw new HttpError(
      409,
      "MEDIA_ALREADY_USED",
      "该海报已属于另一场活动，请重新上传独立海报。",
    );
  const now = new Date().toISOString();
  const record: EventRecord = {
    ...input,
    id,
    version: (existing?.version ?? 0) + 1,
    eventDate: input.startsAt ? bangkokDate(input.startsAt) : "2026-07-10",
    timezone: "Asia/Bangkok",
    timePrecision: input.startsAt ? "exact" : "backfill_placeholder",
    publishedAt:
      input.status === "published"
        ? (existing?.publishedAt ?? now)
        : (existing?.publishedAt ?? null),
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
    poster: {
      url: `/media/events/${encodeURIComponent(id)}/${encodeURIComponent(input.posterMediaId)}`,
      width: media?.width ?? existing?.poster.width ?? 1,
      height: media?.height ?? existing?.poster.height ?? 1,
    },
  };
  const backupId =
    input.status === "unpublished" ? crypto.randomUUID() : undefined;
  const response: EventMutationResult = {
    status: existing ? 200 : 201,
    result:
      input.status === "unpublished"
        ? "unpublished"
        : existing
          ? "updated"
          : "created",
    event: record,
    etag: eventEtag(record.version),
    ...(backupId ? { pendingBackupId: backupId } : {}),
  };
  const assertionId = crypto.randomUUID();
  const conditions: string[] = [];
  const bindings: unknown[] = [];
  if (existing) {
    conditions.push(
      "EXISTS(SELECT 1 FROM event_details WHERE content_id=? AND version=?)",
    );
    bindings.push(id, existing.version);
  } else {
    conditions.push("NOT EXISTS(SELECT 1 FROM content_entries WHERE id=?)");
    bindings.push(id);
  }
  if (guard) {
    conditions.push(guard.sql);
    bindings.push(...guard.bindings);
  }
  if (input.status === "published") {
    conditions.push(
      "NOT EXISTS(SELECT 1 FROM event_unpublish_records WHERE event_id=? AND status='pending')",
    );
    bindings.push(id);
  }
  if (input.status !== "unpublished") {
    conditions.push(
      "EXISTS(SELECT 1 FROM event_media m JOIN media_assets a ON a.id=m.media_id WHERE m.media_id=? AND a.status='ready' AND m.storage='private' AND m.verified_at IS NOT NULL)",
    );
    bindings.push(input.posterMediaId);
  }
  if (external) {
    if (mapping) {
      conditions.push(
        "EXISTS(SELECT 1 FROM event_external_links WHERE source=? AND external_id=? AND source_version=?)",
      );
      bindings.push(
        external.source,
        external.externalId,
        mapping.source_version,
      );
    } else {
      conditions.push(
        "NOT EXISTS(SELECT 1 FROM event_external_links WHERE source=? AND external_id=?)",
      );
      bindings.push(external.source, external.externalId);
    }
  }
  const statements = [
    assertStatement(db, assertionId, conditions.join(" AND "), bindings),
  ];
  const dbStatus = input.status === "unpublished" ? "archived" : input.status;
  if (existing) {
    statements.push(
      db
        .prepare(
          "UPDATE content_entries SET title=?,summary=?,status=?,updated_by=?,updated_at=?,published_at=?,published_by=CASE WHEN ?='published' THEN ? ELSE published_by END WHERE id=?",
        )
        .bind(
          input.title,
          input.summary,
          dbStatus,
          actor.userId,
          now,
          record.publishedAt,
          dbStatus,
          actor.userId,
          id,
        ),
    );
    statements.push(
      db
        .prepare(
          `UPDATE event_details SET starts_at=?,ends_at=?,event_date=?,time_precision=?,location=?,category=?,initiator=?,series_name=?,series_issue=?,poster_media_id=?,poster_alt=?,detail_url=?,registration_url=?,source_published_at=?,version=? WHERE content_id=?`,
        )
        .bind(...detailValues(input, record), id),
    );
  } else {
    statements.push(
      db
        .prepare(
          "INSERT INTO content_entries(id,type,locale,slug,title,summary,status,created_by,updated_by,published_by,published_at,created_at,updated_at) VALUES(?,'event','zh-CN',?,?,?,?,?,?,?,?,?,?)",
        )
        .bind(
          id,
          id,
          input.title,
          input.summary,
          dbStatus,
          actor.userId,
          actor.userId,
          input.status === "published" ? actor.userId : null,
          record.publishedAt,
          now,
          now,
        ),
    );
    statements.push(
      db
        .prepare(
          "INSERT INTO event_details(content_id,starts_at,ends_at,event_date,time_precision,location,category,initiator,series_name,series_issue,poster_media_id,poster_alt,detail_url,registration_url,source_published_at,version) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
        )
        .bind(id, ...detailValues(input, record)),
    );
  }
  statements.push(
    db
      .prepare(
        "INSERT INTO content_revisions(id,content_id,revision_number,snapshot_json,created_by,created_at) VALUES(?,?,?,?,?,?)",
      )
      .bind(
        crypto.randomUUID(),
        id,
        record.version,
        JSON.stringify(record),
        actor.userId,
        now,
      ),
  );
  statements.push(
    db
      .prepare(
        "INSERT INTO audit_logs(id,actor_user_id,action,resource_type,resource_id,metadata_json,created_at) VALUES(?,?,?,'event',?,?,?)",
      )
      .bind(
        crypto.randomUUID(),
        actor.userId,
        options.restoredFromVersion
          ? "event.restored"
          : `event.${response.result}`,
        id,
        JSON.stringify({
          actorType: actor.actorType,
          source: actor.source,
          keyId: actor.keyId,
          version: record.version,
          result: "success",
          restoredFromVersion: options.restoredFromVersion,
        }),
        now,
      ),
  );
  if (external) {
    statements.push(
      db
        .prepare(
          "INSERT INTO event_external_links(source,external_id,event_id,source_version,request_hash,response_json,updated_at) VALUES(?,?,?,?,?,?,?) ON CONFLICT(source,external_id) DO UPDATE SET source_version=excluded.source_version,request_hash=excluded.request_hash,response_json=excluded.response_json,updated_at=excluded.updated_at",
        )
        .bind(
          external.source,
          external.externalId,
          id,
          external.sourceVersion,
          external.requestHash,
          JSON.stringify(response),
          now,
        ),
    );
  }
  if (backupId)
    statements.push(
      db
        .prepare(
          "INSERT INTO event_unpublish_records(id,event_id,version,snapshot_json,status,created_at) VALUES(?,?,?,?,'pending',?)",
        )
        .bind(
          backupId,
          id,
          record.version,
          JSON.stringify({
            eventId: id,
            version: record.version,
            status: "unpublished",
            actorType: actor.actorType,
            source: actor.source,
            keyId: actor.keyId,
            at: now,
          }),
          now,
        ),
    );
  if (idempotency) {
    statements.push(
      db
        .prepare(
          "DELETE FROM integration_requests WHERE key_id=? AND idempotency_key=? AND expires_at<=?",
        )
        .bind(idempotency.keyId, idempotency.key, now),
    );
    statements.push(
      db
        .prepare(
          "INSERT INTO integration_requests(key_id,idempotency_key,request_hash,status_code,response_json,etag,expires_at,created_at) VALUES(?,?,?,?,?,?,?,?)",
        )
        .bind(
          idempotency.keyId,
          idempotency.key,
          idempotency.requestHash,
          response.status,
          JSON.stringify(response),
          response.etag,
          new Date(Date.now() + 7 * 86400_000).toISOString(),
          now,
        ),
    );
  }
  statements.push(
    db
      .prepare("DELETE FROM event_write_assertions WHERE id=?")
      .bind(assertionId),
  );
  try {
    await db.batch(statements);
  } catch (error) {
    await checkGuard(db, guard);
    if (idempotency) {
      const replay = await readIdempotency(
        db,
        idempotency.keyId,
        idempotency.key,
        idempotency.requestHash,
      );
      if (replay)
        return { ...(replay.body as EventMutationResult), replayed: true };
    }
    if (external) {
      const latestMapping = await db
        .prepare(
          "SELECT source_version,request_hash,response_json FROM event_external_links WHERE source=? AND external_id=?",
        )
        .bind(external.source, external.externalId)
        .first<{
          source_version: number;
          request_hash: string;
          response_json: string;
        }>();
      if (
        latestMapping &&
        latestMapping.source_version >= external.sourceVersion
      ) {
        if (
          latestMapping.source_version === external.sourceVersion &&
          latestMapping.request_hash === external.requestHash
        )
          return {
            ...(JSON.parse(latestMapping.response_json) as EventMutationResult),
            replayed: true,
          };
        throw new HttpError(
          409,
          "SOURCE_VERSION_CONFLICT",
          "来源版本已变化，所有写入已撤回。",
        );
      }
    }
    const latest = await getEvent(db, id);
    if (
      (existing && latest?.version !== existing.version) ||
      (!existing && latest)
    )
      throw new HttpError(
        412,
        "PRECONDITION_FAILED",
        "活动已被其他操作修改，所有写入已撤回。",
      );
    throw error;
  }
  return response;
}
function detailValues(input: EventInput, record: EventRecord): unknown[] {
  return [
    input.startsAt,
    input.endsAt,
    record.eventDate,
    record.timePrecision,
    input.location,
    input.category,
    input.initiator,
    input.series?.name ?? null,
    input.series?.issue ?? null,
    input.posterMediaId,
    input.posterAlt,
    input.detailUrl,
    input.registrationUrl,
    input.sourcePublishedAt,
    record.version,
  ];
}
export async function unpublishEvent(
  db: D1Database,
  id: string,
  options: EventWriteOptions,
): Promise<EventMutationResult> {
  await checkGuard(db, options.guard);
  if (options.idempotency) {
    const replay = await readIdempotency(
      db,
      options.idempotency.keyId,
      options.idempotency.key,
      options.idempotency.requestHash,
    );
    if (replay) {
      await checkGuard(db, options.guard);
      return { ...(replay.body as EventMutationResult), replayed: true };
    }
  }
  const existing = await getEvent(db, id);
  if (!existing) throw new HttpError(404, "EVENT_NOT_FOUND", "活动不存在。");
  // An administrator retries backup with the current ETag. Integration replays
  // go through the persisted idempotency/source-version response below.
  if (
    existing.status === "unpublished" &&
    !options.external &&
    options.expectedVersion === existing.version
  ) {
    const pending = await db
      .prepare(
        "SELECT id FROM event_unpublish_records WHERE event_id=? AND version=? AND status='pending'",
      )
      .bind(id, existing.version)
      .first<{ id: string }>();
    if (pending) {
      await checkGuard(db, options.guard);
      return {
        status: 200,
        result: "unpublished",
        event: existing,
        etag: eventEtag(existing.version),
        pendingBackupId: pending.id,
        replayed: true,
      };
    }
  }
  const input: EventInput = {
    title: existing.title,
    startsAt: existing.startsAt,
    endsAt: existing.endsAt,
    location: existing.location,
    category: existing.category,
    summary: existing.summary,
    posterMediaId: existing.posterMediaId,
    posterAlt: existing.posterAlt,
    detailUrl: existing.detailUrl,
    registrationUrl: existing.registrationUrl,
    initiator: existing.initiator,
    series: existing.series,
    sourcePublishedAt: existing.sourcePublishedAt,
    status: "unpublished",
  };
  return saveEvent(db, input, { ...options, id });
}
