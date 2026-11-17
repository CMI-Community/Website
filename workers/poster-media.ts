import { listArchiveEvents } from "../app/modules/community-content/archive-repository.server";

/** Canvas-readable historical images, limited to the current published catalog. */
export async function publicPosterColorImage(request: Request, env: Pick<CloudflareEnv, "DB" | "MEDIA">): Promise<Response | null> {
  const path = new URL(request.url).pathname;
  if (!path.startsWith("/media/poster-colors/")) return null;
  const headers = new Headers({ "cache-control": "no-store", "x-content-type-options": "nosniff", "cross-origin-resource-policy": "same-origin" });
  if (!["GET", "HEAD"].includes(request.method)) {
    headers.set("allow", "GET, HEAD");
    return new Response(null, { status: 405, headers });
  }
  const id = path.slice("/media/poster-colors/".length);
  if (!/^[a-zA-Z0-9._-]{1,200}$/.test(id)) return new Response("Not found", { status: 404, headers });
  try {
    const poster = (await listArchiveEvents(env, true)).find(poster => poster.id === id);
    if (!poster || !/^[a-zA-Z0-9._-]+\.(webp|png|jpe?g)$/.test(poster.imagePath)) return new Response("Not found", { status: 404, headers });
    const object = await env.MEDIA.get(`poster-wall/v1/posters/${poster.imagePath}`);
    if (!object) return new Response("Not found", { status: 404, headers });
    headers.set("content-type", object.httpMetadata?.contentType ?? (poster.imagePath.endsWith(".png") ? "image/png" : /\.jpe?g$/.test(poster.imagePath) ? "image/jpeg" : "image/webp"));
    return new Response(request.method === "HEAD" ? null : object.body, { headers });
  } catch {
    return new Response("Image unavailable", { status: 503, headers });
  }
}
