import { HttpError, json, methodNotAllowed } from "./lib/http";
import {
  adminWriteGuard,
  assertIntegrationActive,
  integrationWriteGuard,
  sha256,
  type EventAdmin,
  type IntegrationKey,
} from "./integration-auth";
import type { EventActor } from "../app/modules/activities/event-schema";

const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
type ImageInfo = {
  width: number;
  height: number;
  mimeType: "image/png" | "image/jpeg" | "image/webp";
  extension: string;
};
function invalidImage(): never {
  throw new HttpError(
    422,
    "INVALID_IMAGE",
    "海报必须是完整的 JPG、PNG 或 WebP 图片。",
  );
}

export function inspectImage(buffer: ArrayBuffer): ImageInfo {
  const bytes = new Uint8Array(buffer);
  if (!bytes.length || bytes.length > MAX_IMAGE_BYTES)
    throw new HttpError(413, "IMAGE_TOO_LARGE", "海报大小必须在 10 MB 以内。");
  const view = new DataView(buffer);
  const ascii = (start: number, count: number) =>
    String.fromCharCode(...bytes.slice(start, start + count));
  let image: ImageInfo | undefined;
  if (
    bytes.length >= 45 &&
    [137, 80, 78, 71, 13, 10, 26, 10].every((b, i) => bytes[i] === b) &&
    ascii(12, 4) === "IHDR"
  ) {
    if (view.getUint32(8) !== 13 || ascii(bytes.length - 8, 4) !== "IEND")
      invalidImage();
    let offset = 8,
      hasData = false;
    while (offset + 12 <= bytes.length) {
      const size = view.getUint32(offset);
      if (offset + 12 + size > bytes.length) invalidImage();
      if (ascii(offset + 4, 4) === "IDAT") hasData = true;
      offset += 12 + size;
    }
    if (offset !== bytes.length || !hasData) invalidImage();
    image = {
      width: view.getUint32(16),
      height: view.getUint32(20),
      mimeType: "image/png",
      extension: "png",
    };
  } else if (
    bytes.length >= 30 &&
    ascii(0, 4) === "RIFF" &&
    ascii(8, 4) === "WEBP"
  ) {
    if (view.getUint32(4, true) + 8 !== bytes.length) invalidImage();
    const format = ascii(12, 4);
    const firstChunkSize = view.getUint32(16, true);
    if (20 + firstChunkSize > bytes.length) invalidImage();
    if (format === "VP8X" && bytes.length >= 30) {
      const size24 = (i: number) =>
        bytes[i] + (bytes[i + 1] << 8) + (bytes[i + 2] << 16) + 1;
      image = {
        width: size24(24),
        height: size24(27),
        mimeType: "image/webp",
        extension: "webp",
      };
      let offset = 30,
        hasImage = false;
      while (offset + 8 <= bytes.length) {
        const kind = ascii(offset, 4),
          size = view.getUint32(offset + 4, true);
        if (offset + 8 + size > bytes.length) invalidImage();
        if (kind === "VP8 " || kind === "VP8L") hasImage = true;
        offset += 8 + size + (size % 2);
      }
      if (!hasImage || offset !== bytes.length) invalidImage();
    } else if (
      format === "VP8 " &&
      firstChunkSize > 10 &&
      bytes[23] === 0x9d &&
      bytes[24] === 0x01 &&
      bytes[25] === 0x2a
    ) {
      image = {
        width: view.getUint16(26, true) & 0x3fff,
        height: view.getUint16(28, true) & 0x3fff,
        mimeType: "image/webp",
        extension: "webp",
      };
    } else if (format === "VP8L" && firstChunkSize > 5 && bytes[20] === 0x2f) {
      const bits = view.getUint32(21, true);
      image = {
        width: (bits & 0x3fff) + 1,
        height: ((bits >> 14) & 0x3fff) + 1,
        mimeType: "image/webp",
        extension: "webp",
      };
    }
  } else if (
    bytes.length >= 12 &&
    bytes[0] === 0xff &&
    bytes[1] === 0xd8 &&
    bytes.at(-2) === 0xff &&
    bytes.at(-1) === 0xd9
  ) {
    let offset = 2,
      hasScan = false;
    while (offset + 4 < bytes.length) {
      if (bytes[offset] !== 0xff) invalidImage();
      if (bytes[offset + 1] === 0xff) {
        offset++;
        continue;
      }
      const marker = bytes[offset + 1];
      if (marker === 0xd9) break;
      const length = view.getUint16(offset + 2);
      if (length < 2 || offset + 2 + length > bytes.length) invalidImage();
      if (marker === 0xda) {
        hasScan =
          Boolean(image) && length >= 6 && offset + length + 4 < bytes.length;
        break;
      }
      if ([0xc0, 0xc1, 0xc2].includes(marker) && length >= 8) {
        image = {
          width: view.getUint16(offset + 7),
          height: view.getUint16(offset + 5),
          mimeType: "image/jpeg",
          extension: "jpg",
        };
      }
      offset += 2 + length;
    }
    if (!hasScan) invalidImage();
  }
  if (
    !image ||
    image.width < 1 ||
    image.height < 1 ||
    image.width > 16000 ||
    image.height > 16000 ||
    image.width * image.height > 40_000_000
  )
    invalidImage();
  return image;
}

interface MediaRow {
  id: string;
  object_key: string;
  mime_type: string;
  width: number;
  height: number;
}
async function mediaResponse(
  request: Request,
  env: CloudflareEnv,
  media: MediaRow | null,
): Promise<Response> {
  if (!media || !env.EVENT_MEDIA)
    return new Response("Not found", {
      status: 404,
      headers: { "cache-control": "no-store" },
    });
  const object = await env.EVENT_MEDIA.get(media.object_key);
  if (!object)
    return new Response("Not found", {
      status: 404,
      headers: { "cache-control": "no-store" },
    });
  return new Response(request.method === "HEAD" ? null : object.body, {
    headers: {
      "content-type": media.mime_type,
      "cache-control": "no-store, max-age=0",
      "x-content-type-options": "nosniff",
      "content-security-policy": "default-src 'none'; sandbox",
      "cross-origin-resource-policy": "same-origin",
    },
  });
}

export async function handleEventMedia(
  request: Request,
  env: CloudflareEnv,
): Promise<Response | null> {
  const match = new URL(request.url).pathname.match(
    /^\/media\/events\/([a-zA-Z0-9-]{1,160})\/([a-zA-Z0-9-]{1,160})$/,
  );
  if (!match) return null;
  if (!["GET", "HEAD"].includes(request.method))
    return methodNotAllowed(["GET", "HEAD"]);
  const media = await env.DB.prepare(
    `SELECT m.id,m.object_key,m.mime_type,em.width,em.height
    FROM content_entries c JOIN event_details d ON d.content_id=c.id
    JOIN media_assets m ON m.id=d.poster_media_id JOIN event_media em ON em.media_id=m.id
    WHERE c.id=?1 AND m.id=?2 AND c.status='published' AND m.status='ready'
      AND em.storage='private' AND em.verified_at IS NOT NULL`,
  )
    .bind(match[1], match[2])
    .first<MediaRow>();
  return mediaResponse(request, env, media);
}

export async function adminMediaPreview(
  request: Request,
  env: CloudflareEnv,
  id: string,
): Promise<Response> {
  if (!["GET", "HEAD"].includes(request.method))
    return methodNotAllowed(["GET", "HEAD"]);
  const media = await env.DB.prepare(
    `SELECT m.id,m.object_key,m.mime_type,em.width,em.height FROM media_assets m
    JOIN event_media em ON em.media_id=m.id WHERE m.id=?1 AND m.status='ready' AND em.storage='private' AND em.verified_at IS NOT NULL`,
  )
    .bind(id)
    .first<MediaRow>();
  return mediaResponse(request, env, media);
}

export async function uploadEventMedia(
  request: Request,
  env: CloudflareEnv,
  actor: EventActor | EventAdmin,
  key?: IntegrationKey,
): Promise<Response> {
  if (request.method !== "POST") return methodNotAllowed(["POST"]);
  if (!env.EVENT_MEDIA)
    throw new HttpError(503, "MEDIA_UNAVAILABLE", "私有海报存储尚未配置。");
  const contentLength = Number(request.headers.get("content-length"));
  if (contentLength > MAX_IMAGE_BYTES + 64 * 1024)
    throw new HttpError(413, "IMAGE_TOO_LARGE", "海报大小必须在 10 MB 以内。");
  const reader = request.body?.getReader();
  if (!reader) throw new HttpError(400, "INVALID_UPLOAD", "请上传一张海报。");
  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const chunk = await reader.read();
    if (chunk.done) break;
    total += chunk.value.byteLength;
    if (total > MAX_IMAGE_BYTES + 64 * 1024) {
      await reader.cancel();
      throw new HttpError(
        413,
        "IMAGE_TOO_LARGE",
        "海报大小必须在 10 MB 以内。",
      );
    }
    chunks.push(chunk.value);
  }
  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  const form = await new Response(bytes, {
    headers: { "content-type": request.headers.get("content-type") ?? "" },
  })
    .formData()
    .catch(() => {
      throw new HttpError(400, "INVALID_UPLOAD", "请上传一张海报。");
    });
  const file = form.get("file");
  if (!(file instanceof File))
    throw new HttpError(400, "INVALID_UPLOAD", "请上传一张海报。");
  const buffer = await file.arrayBuffer();
  const image = inspectImage(buffer);
  if (file.type && file.type !== image.mimeType)
    throw new HttpError(
      422,
      "MIME_MISMATCH",
      "文件内容与声明的图片类型不一致。",
    );
  const checksum = await sha256(buffer);
  const idempotencyKey = key ? request.headers.get("idempotency-key") : null;
  if (key && (!idempotencyKey || !/^[\w-]{8,128}$/.test(idempotencyKey)))
    throw new HttpError(
      400,
      "IDEMPOTENCY_REQUIRED",
      "上传需提供 Idempotency-Key。",
    );
  const requestHash = await sha256(
    `POST:${new URL(request.url).pathname}:${image.mimeType}:${checksum}`,
  );
  const replay = async () => {
    if (!key || !idempotencyKey) return null;
    const row = await env.DB.prepare(
      "SELECT request_hash,response_json,status_code FROM integration_requests WHERE key_id=?1 AND idempotency_key=?2 AND expires_at>?3",
    )
      .bind(key.id, idempotencyKey, new Date().toISOString())
      .first<{
        request_hash: string;
        response_json: string;
        status_code: number;
      }>();
    if (!row) return null;
    await assertIntegrationActive(env, key);
    if (row.request_hash !== requestHash)
      throw new HttpError(
        409,
        "IDEMPOTENCY_CONFLICT",
        "此幂等键已用于其他请求。",
      );
    return json(JSON.parse(row.response_json), { status: row.status_code });
  };
  const previous = await replay();
  if (previous) return previous;
  const id = crypto.randomUUID();
  const objectKey = `events/uploads/${id}/v1/poster.${image.extension}`;
  await env.EVENT_MEDIA.put(objectKey, buffer, {
    httpMetadata: { contentType: image.mimeType },
    customMetadata: { sha256: checksum },
  });
  const now = new Date().toISOString();
  const payload = {
    media: {
      id,
      status: "ready",
      width: image.width,
      height: image.height,
      mimeType: image.mimeType,
      previewUrl: `/api/v1/admin/media/${id}`,
    },
  };
  const assertion = crypto.randomUUID();
  const guard = key
    ? integrationWriteGuard(key)
    : "sessionId" in actor
      ? adminWriteGuard(actor)
      : null;
  const statements: D1PreparedStatement[] = [];
  if (guard)
    statements.push(
      env.DB.prepare(
        `INSERT INTO event_write_assertions(id,passed) SELECT ?,CASE WHEN ${guard.sql} THEN 1 ELSE 0 END`,
      ).bind(assertion, ...guard.bindings),
    );
  statements.push(
    env.DB.prepare(
      `INSERT INTO media_assets(id,object_key,mime_type,byte_size,status,created_by,checksum_sha256,source_system,rights_status)
      VALUES(?1,?2,?3,?4,'ready',?5,?6,'event-admin','cleared')`,
    ).bind(
      id,
      objectKey,
      image.mimeType,
      buffer.byteLength,
      actor.userId,
      checksum,
    ),
    env.DB.prepare(
      "INSERT INTO event_media(media_id,width,height,source,key_id,storage,verified_at) VALUES(?1,?2,?3,?4,?5,'private',?6)",
    ).bind(
      id,
      image.width,
      image.height,
      actor.source ?? null,
      actor.keyId ?? null,
      now,
    ),
    env.DB.prepare(
      "INSERT INTO audit_logs(id,actor_user_id,action,resource_type,resource_id,metadata_json) VALUES(?1,?2,'event.media.uploaded','media',?3,?4)",
    ).bind(
      crypto.randomUUID(),
      actor.userId,
      id,
      JSON.stringify({
        actorType: actor.actorType,
        source: actor.source,
        keyId: actor.keyId,
        sha256: checksum,
      }),
    ),
  );
  if (key && idempotencyKey)
    statements.push(
      env.DB.prepare(
        "DELETE FROM integration_requests WHERE key_id=?1 AND idempotency_key=?2 AND expires_at<=?3",
      ).bind(key.id, idempotencyKey, now),
      env.DB.prepare(
        `INSERT INTO integration_requests(key_id,idempotency_key,request_hash,status_code,response_json,expires_at,created_at)
      VALUES(?1,?2,?3,201,?4,?5,?6)`,
      ).bind(
        key.id,
        idempotencyKey,
        requestHash,
        JSON.stringify(payload),
        new Date(Date.now() + 7 * 86_400_000).toISOString(),
        now,
      ),
    );
  if (guard)
    statements.push(
      env.DB.prepare("DELETE FROM event_write_assertions WHERE id=?1").bind(
        assertion,
      ),
    );
  try {
    await env.DB.batch(statements);
  } catch (error) {
    await env.DB.prepare(
      "INSERT INTO audit_logs(id,actor_user_id,action,resource_type,resource_id,metadata_json) VALUES(?1,?2,'event.media.private_orphan','media',?3,?4)",
    )
      .bind(
        crypto.randomUUID(),
        actor.userId,
        id,
        JSON.stringify({
          objectKey,
          actorType: actor.actorType,
          keyId: actor.keyId,
          sha256: checksum,
        }),
      )
      .run();
    if (key) {
      const current = await env.DB.prepare(
        `SELECT 1 WHERE ${integrationWriteGuard(key).sql}`,
      )
        .bind(...integrationWriteGuard(key).bindings)
        .first();
      if (!current)
        throw new HttpError(
          403,
          "AUTHORIZATION_CHANGED",
          "授权已失效，上传未完成登记。",
        );
    }
    const result = await replay();
    if (result) return result;
    throw error;
  }
  return json(payload, { status: 201 });
}

export async function completeUnpublishBackups(
  env: CloudflareEnv,
  eventId: string,
): Promise<boolean> {
  if (!env.EVENT_BACKUPS) return false;
  const records = await env.DB.prepare(
    "SELECT id,version,snapshot_json,created_at FROM event_unpublish_records WHERE event_id=?1 AND status='pending' ORDER BY version",
  )
    .bind(eventId)
    .all<{
      id: string;
      version: number;
      snapshot_json: string;
      created_at: string;
    }>();
  try {
    for (const record of records.results) {
      const body = JSON.stringify({
        eventId,
        version: record.version,
        unpublishedAt: record.created_at,
        snapshot: JSON.parse(record.snapshot_json),
      });
      const objectKey = `unpublish/${eventId}/v${record.version}-${record.id}.json`;
      await env.EVENT_BACKUPS.put(objectKey, body, {
        httpMetadata: { contentType: "application/json" },
        customMetadata: { sha256: await sha256(body) },
      });
      const verify = await env.EVENT_BACKUPS.get(objectKey);
      if (!verify || (await verify.text()) !== body) return false;
      await env.DB.prepare(
        "UPDATE event_unpublish_records SET status='complete',completed_at=?2 WHERE id=?1",
      )
        .bind(record.id, new Date().toISOString())
        .run();
    }
    return true;
  } catch {
    return false;
  }
}
