import { createRequestHandler, RouterContextProvider } from "react-router";
import { cloudflareContext } from "../app/shared/cloudflare-context";
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

export default {
  async fetch(request, env, ctx) {
    const redirect = canonicalRedirect(request);
    if (redirect) return redirect;

    const url = new URL(request.url);
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
