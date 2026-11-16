import { getPhoto } from "../app/modules/community-content/content-repository.server";

/** Preserve historical URLs while applying management state to indexed photos. */
export async function publicPhotoAsset(
  request: Request,
  env: CloudflareEnv,
): Promise<Response | null> {
  const match = new URL(request.url).pathname.match(
    /^\/media\/photo-museum\/(v[1-9][0-9]*)\/(thumbs|full)\/([a-z0-9][a-z0-9-]{2,63}\.webp)$/,
  );
  if (!match) return null;
  const headers = new Headers({
    "cache-control": "no-store",
    "x-content-type-options": "nosniff",
  });
  if (!["GET", "HEAD"].includes(request.method)) {
    headers.set("allow", "GET, HEAD");
    return new Response(null, { status: 405, headers });
  }
  const objectKey = `photo-museum/${match[1]}/${match[2]}/${match[3]}`;
  const indexed = await env.DB.prepare(
    "SELECT id FROM community_photos WHERE legacy_full_path=?1 OR legacy_thumbnail_path=?1",
  )
    .bind(objectKey)
    .first<{ id: string }>();
  if (indexed && !(await getPhoto(env.DB, indexed.id, true)))
    return new Response("Not found", { status: 404, headers });
  const object = await env.MEDIA.get(objectKey);
  if (!object) return new Response("Not found", { status: 404, headers });
  headers.set("content-type", "image/webp");
  return new Response(request.method === "HEAD" ? null : object.body, {
    headers,
  });
}
