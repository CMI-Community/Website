import {
  HttpError,
  isHttpError,
  json,
  methodNotAllowed,
  parseJson,
} from "./lib/http";
import { requireEventAdmin, requireSameOrigin } from "./integration-auth";
import {
  getEventSeriesMemberships,
  getPhoto,
  getSeries,
  listPhotos,
  listSeries,
} from "../app/modules/community-content/content-repository.server";
import {
  importLegacyPhotos,
  saveEventSeries,
  savePhoto,
  saveSeries,
  verifiedMedia,
} from "../app/modules/community-content/content-service.server";
import {
  listArchiveEvents,
  saveArchiveEvent,
} from "../app/modules/community-content/archive-repository.server";

function version(request: Request): number {
  const value = request.headers.get("if-match");
  if (!value)
    throw new HttpError(
      428,
      "PRECONDITION_REQUIRED",
      "请提供当前内容版本后再保存。",
    );
  const match = value.match(/^"v(0|[1-9][0-9]*)"$/);
  if (!match || !Number.isSafeInteger(Number(match[1])))
    throw new HttpError(400, "INVALID_ETAG", "内容版本格式无效。");
  return Number(match[1]);
}
export async function handleCommunityContentApi(
  request: Request,
  env: CloudflareEnv,
  ctx: ExecutionContext,
): Promise<Response | null> {
  const path = new URL(request.url).pathname;
  const match = path.match(
    /^\/api\/v1\/admin\/(series|photos|event-series|archive-events)(?:\/([^/]+))?(?:\/(preview|image))?$/,
  );
  if (!match) return null;
  try {
    requireSameOrigin(request);
    const actor = await requireEventAdmin(request, env, ctx);
    const resource = match[1],
      id = match[2] ? decodeURIComponent(match[2]) : undefined;
    if (match[3]) {
      if (resource !== "photos" || !id)
        throw new HttpError(404, "NOT_FOUND", "接口不存在。");
      if (!["GET", "HEAD"].includes(request.method))
        return methodNotAllowed(["GET", "HEAD"]);
      const photo = await getPhoto(env.DB, id);
      if (!photo) throw new HttpError(404, "PHOTO_NOT_FOUND", "照片不存在。");
      const legacyPath =
        match[3] === "preview"
          ? photo.legacyThumbnailPath
          : photo.legacyFullPath;
      const media = photo.mediaId
        ? await verifiedMedia(env.DB, photo.mediaId)
        : null;
      const object = legacyPath
        ? await env.MEDIA.get(legacyPath)
        : media && env.EVENT_MEDIA
          ? await env.EVENT_MEDIA.get(media.objectKey)
          : null;
      if (!object)
        throw new HttpError(404, "PHOTO_NOT_FOUND", "图片暂时不可用。");
      return new Response(request.method === "HEAD" ? null : object.body, {
        headers: {
          "content-type": media?.mimeType ?? "image/webp",
          "cache-control": "no-store",
          "x-content-type-options": "nosniff",
        },
      });
    }
    if (resource === "photos" && id === "import-legacy") {
      if (request.method !== "POST") return methodNotAllowed(["POST"]);
      return json(await importLegacyPhotos(env, actor));
    }
    if (request.method === "GET") {
      if (resource === "series") {
        if (!id) return json({ series: await listSeries(env.DB) });
        const series = await getSeries(env.DB, id);
        if (!series)
          throw new HttpError(404, "SERIES_NOT_FOUND", "栏目不存在。");
        return json({ series }, { headers: { ETag: `"v${series.version}"` } });
      }
      if (resource === "photos") {
        if (!id) return json({ photos: await listPhotos(env.DB) });
        const photo = await getPhoto(env.DB, id);
        if (!photo) throw new HttpError(404, "PHOTO_NOT_FOUND", "照片不存在。");
        return json({ photo }, { headers: { ETag: `"v${photo.version}"` } });
      }
      if (resource === "event-series" && !id)
        return json({ memberships: await getEventSeriesMemberships(env.DB) });
      if (resource === "archive-events") {
        const events = await listArchiveEvents(env);
        if (!id) return json({ events });
        const event = events.find((event) => event.id === id);
        if (!event)
          throw new HttpError(404, "EVENT_NOT_FOUND", "历史活动不存在。");
        return json({ event }, { headers: { ETag: `"v${event.version}"` } });
      }
    }
    if (
      request.method === "POST" &&
      !id &&
      (resource === "series" || resource === "photos")
    ) {
      const raw = await parseJson(request);
      if (resource === "series") {
        const series = await saveSeries(env.DB, actor, raw);
        return json(
          { series },
          { status: 201, headers: { ETag: `"v${series.version}"` } },
        );
      }
      const photo = await savePhoto(env.DB, actor, raw);
      return json(
        { photo },
        { status: 201, headers: { ETag: `"v${photo.version}"` } },
      );
    }
    if (request.method === "PATCH" && id) {
      const expected = version(request),
        raw = await parseJson(request);
      if (resource === "series") {
        const series = await saveSeries(env.DB, actor, raw, id, expected);
        return json({ series }, { headers: { ETag: `"v${series.version}"` } });
      }
      if (resource === "photos") {
        const photo = await savePhoto(env.DB, actor, raw, id, expected);
        return json({ photo }, { headers: { ETag: `"v${photo.version}"` } });
      }
      if (resource === "event-series") {
        const membership = await saveEventSeries(
          env.DB,
          actor,
          id,
          raw,
          expected,
        );
        return json(
          { membership },
          { headers: { ETag: `"v${membership.version}"` } },
        );
      }
      const event = await saveArchiveEvent(env, actor, id, raw, expected);
      return json({ event }, { headers: { ETag: `"v${event.version}"` } });
    }
    return methodNotAllowed(id ? ["GET", "PATCH"] : ["GET", "POST"]);
  } catch (error) {
    return json(
      {
        error: {
          code: isHttpError(error) ? error.code : "INTERNAL_ERROR",
          message: isHttpError(error)
            ? error.message
            : "操作未完成，请稍后重试。",
        },
      },
      { status: isHttpError(error) ? error.status : 500 },
    );
  }
}
export async function handleCommunityMedia(
  request: Request,
  env: CloudflareEnv,
): Promise<Response | null> {
  const path = new URL(request.url).pathname;
  const photoMatch = path.match(
    /^\/media\/community\/photos\/([a-zA-Z0-9-]{1,160})$/,
  );
  const seriesMatch = path.match(
    /^\/media\/community\/series\/([a-zA-Z0-9-]{1,160})\/logo$/,
  );
  if (!photoMatch && !seriesMatch) return null;
  if (!["GET", "HEAD"].includes(request.method))
    return methodNotAllowed(["GET", "HEAD"]);
  let mediaId: string | null = null;
  if (photoMatch) {
    const photo = await getPhoto(env.DB, photoMatch[1], true);
    if (photo?.legacyFullPath) {
      const path =
        new URL(request.url).searchParams.get("thumbnail") === "1"
          ? photo.legacyThumbnailPath
          : photo.legacyFullPath;
      const object = path ? await env.MEDIA.get(path) : null;
      return new Response(
        object && request.method !== "HEAD"
          ? object.body
          : object
            ? null
            : "Not found",
        {
          status: object ? 200 : 404,
          headers: {
            "cache-control": "no-store",
            "x-content-type-options": "nosniff",
            ...(object ? { "content-type": "image/webp" } : {}),
          },
        },
      );
    }
    mediaId = photo?.mediaId ?? null;
  }
  if (seriesMatch)
    mediaId =
      (await getSeries(env.DB, seriesMatch[1], true))?.logoMediaId ?? null;
  if (!mediaId || !env.EVENT_MEDIA)
    return new Response("Not found", {
      status: 404,
      headers: { "cache-control": "no-store" },
    });
  try {
    const media = await verifiedMedia(env.DB, mediaId);
    const object = await env.EVENT_MEDIA.get(media.objectKey);
    if (!object)
      return new Response("Not found", {
        status: 404,
        headers: { "cache-control": "no-store" },
      });
    return new Response(request.method === "HEAD" ? null : object.body, {
      headers: {
        "content-type": media.mimeType,
        "cache-control": "no-store",
        "x-content-type-options": "nosniff",
      },
    });
  } catch {
    return new Response("Not found", {
      status: 404,
      headers: { "cache-control": "no-store" },
    });
  }
}
