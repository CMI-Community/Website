import { data, redirect } from "react-router";
import type { Route } from "./+types/blog-legacy";
import { getPublicBlogShortId } from "../modules/blog/blog-repository.server";
import { blogPostPath } from "../modules/blog/blog-schema";
import { cloudflareContext } from "../shared/cloudflare-context";

export { ErrorBoundary, headers } from "./blog-detail";

export async function loader({ context, params, request }: Route.LoaderArgs) {
  const { env } = context.get(cloudflareContext);
  const shortId = await getPublicBlogShortId(env.DB, params.slug);
  if (shortId === null) throw data("文章不存在或已下架。", { status: 404 });
  return redirect(blogPostPath(shortId) + new URL(request.url).search, {
    status: 308,
    headers: { "Cache-Control": "no-store" },
  });
}

export default function LegacyBlog() {
  return null;
}
