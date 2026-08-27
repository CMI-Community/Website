import { createRequestHandler, RouterContextProvider } from "react-router";
import { cloudflareContext } from "../app/shared/cloudflare-context";
import { isPublicActivityObjectKey } from "../app/modules/activities/activity-catalog";
import { handleV1Api } from "./api";
import { createAuth } from "./auth";
import { handleFeedback } from "./feedback";
import { withApiHeaders } from "./lib/http";

const requestHandler = createRequestHandler(
  () => import("virtual:react-router/server-build"),
  import.meta.env.MODE,
);

type SocialProvider = "google" | "github";

function loginCallbackURL(url: URL): string {
  const returnTo = url.searchParams.get("returnTo");
  if (returnTo?.startsWith("/") && !returnTo.startsWith("//")) {
    return new URL(returnTo, url.origin).toString();
  }
  return new URL("/archive/posters", url.origin).toString();
}

async function socialLoginRedirect(
  request: Request,
  env: CloudflareEnv,
  ctx: ExecutionContext,
  provider: SocialProvider,
): Promise<Response> {
  if (request.method !== "GET") {
    return withApiHeaders(
      new Response(JSON.stringify({ error: { code: "METHOD_NOT_ALLOWED", message: "只支持 GET。" } }), {
        status: 405,
        headers: { "content-type": "application/json; charset=utf-8", allow: "GET" },
      }),
    );
  }

  const url = new URL(request.url);
  const authRequest = new Request(new URL("/api/auth/sign-in/social", url.origin), {
    method: "POST",
    headers: {
      "content-type": "application/json",
      origin: url.origin,
      "user-agent": request.headers.get("user-agent") ?? "CMI login bridge",
      "cf-connecting-ip": request.headers.get("cf-connecting-ip") ?? "",
    },
    body: JSON.stringify({ provider, callbackURL: loginCallbackURL(url) }),
  });
  const authResponse = await createAuth(env, ctx).handler(authRequest);
  if (!authResponse.ok) return withApiHeaders(authResponse);

  const payload = (await authResponse.json()) as { url?: string };
  if (!payload.url) {
    return withApiHeaders(
      new Response(
        JSON.stringify({ error: { code: "OAUTH_START_FAILED", message: "登录入口暂时不可用。" } }),
        { status: 502, headers: { "content-type": "application/json; charset=utf-8" } },
      ),
    );
  }

  const headers = new Headers(authResponse.headers);
  headers.set("location", payload.url);
  headers.set("cache-control", "no-store");
  return withApiHeaders(new Response(null, { status: 302, headers }));
}

function canonicalRedirect(request: Request): Response | null {
  const url = new URL(request.url);
  if (url.hostname !== "www.cmi.community") return null;
  url.protocol = "https:";
  url.hostname = "cmi.community";
  url.port = "";
  return Response.redirect(url.toString(), 308);
}

async function publicPhotoAsset(request: Request, env: CloudflareEnv): Promise<Response | null> {
  const url = new URL(request.url);
  const match = url.pathname.match(
    /^\/media\/photo-museum\/(v[1-9][0-9]*)\/(thumbs|full)\/([a-z0-9][a-z0-9-]{2,63}\.webp)$/,
  );
  if (!match) return null;
  if (request.method !== "GET" && request.method !== "HEAD") {
    return new Response(null, { status: 405, headers: { allow: "GET, HEAD" } });
  }

  const object = await env.MEDIA.get(`photo-museum/${match[1]}/${match[2]}/${match[3]}`);
  if (!object) return new Response("Not found", { status: 404 });
  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set("content-type", "image/webp");
  headers.set("cache-control", "public, max-age=31536000, immutable");
  headers.set("etag", object.httpEtag);
  headers.set("x-content-type-options", "nosniff");
  return new Response(request.method === "HEAD" ? null : object.body, { headers });
}

async function publicProjectAsset(request: Request, env: CloudflareEnv): Promise<Response | null> {
  const url = new URL(request.url);
  const match = url.pathname.match(
    /^\/media\/(projects\/waytoagi\/26-lanna-museum\/v1\/[a-zA-Z0-9][a-zA-Z0-9._/-]{0,1023})$/,
  );
  if (!match) return null;
  if (match[1].includes("..") || match[1].includes("//")) {
    return new Response("Not found", { status: 404 });
  }
  if (request.method !== "GET" && request.method !== "HEAD") {
    return new Response(null, { status: 405, headers: { allow: "GET, HEAD" } });
  }

  const object = await env.MEDIA.get(match[1]);
  if (!object) return new Response("Not found", { status: 404 });
  if (match[1].includes("/archive/media/")) {
    const publicMedia = await env.DB.prepare(
      `SELECT 1
       FROM media_assets ma
       JOIN project_archive_media pam ON pam.media_asset_id = ma.id
       JOIN project_archive_entries pae ON pae.id = pam.entry_id
       WHERE ma.object_key = ?
         AND ma.status = 'ready'
         AND ma.rights_status = 'cleared'
         AND pae.status = 'published'
         AND pae.rights_status = 'cleared'
       LIMIT 1`,
    ).bind(match[1]).first();
    if (!publicMedia) return new Response("Not found", { status: 404 });
  }
  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set("cache-control", "public, max-age=31536000, immutable");
  headers.set("etag", object.httpEtag);
  headers.set("x-content-type-options", "nosniff");
  return new Response(request.method === "HEAD" ? null : object.body, { headers });
}

async function publicActivityAsset(request: Request, env: CloudflareEnv): Promise<Response | null> {
  const url = new URL(request.url);
  const match = url.pathname.match(
    /^\/media\/(activities\/[a-z0-9][a-z0-9-]{1,63}\/[a-z0-9][a-z0-9-]{1,95}\/v[1-9][0-9]*\/[a-z0-9][a-z0-9._-]{1,127})$/,
  );
  if (!match) return null;
  if (!isPublicActivityObjectKey(match[1])) return new Response("Not found", { status: 404 });
  if (request.method !== "GET" && request.method !== "HEAD") {
    return new Response(null, { status: 405, headers: { allow: "GET, HEAD" } });
  }

  const object = await env.MEDIA.get(match[1]);
  if (!object) return new Response("Not found", { status: 404 });
  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set("content-type", "image/webp");
  headers.set("cache-control", "public, max-age=31536000, immutable");
  headers.set("etag", object.httpEtag);
  headers.set("x-content-type-options", "nosniff");
  return new Response(request.method === "HEAD" ? null : object.body, { headers });
}

export default {
  async fetch(request, env, ctx) {
    const redirect = canonicalRedirect(request);
    if (redirect) return redirect;

    const url = new URL(request.url);
    const photoAsset = await publicPhotoAsset(request, env);
    if (photoAsset) return photoAsset;
    const projectAsset = await publicProjectAsset(request, env);
    if (projectAsset) return projectAsset;
    const activityAsset = await publicActivityAsset(request, env);
    if (activityAsset) return activityAsset;
    const socialLogin = url.pathname.match(/^\/login\/(google|github)$/);
    if (socialLogin) {
      return socialLoginRedirect(request, env, ctx, socialLogin[1] as SocialProvider);
    }
    if (url.pathname.startsWith("/api/auth/")) {
      return withApiHeaders(await createAuth(env, ctx).handler(request));
    }
    if (url.pathname === "/api/feedback" || url.pathname.startsWith("/api/feedback/")) {
      return withApiHeaders(await handleFeedback(request, env));
    }
    if (url.pathname.startsWith("/api/v1/")) {
      return withApiHeaders(await handleV1Api(request, env, ctx));
    }

    const routerContext = new RouterContextProvider();
    routerContext.set(cloudflareContext, { env, ctx });
    return requestHandler(request, routerContext);
  },
} satisfies ExportedHandler<CloudflareEnv>;
