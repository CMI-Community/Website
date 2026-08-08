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
