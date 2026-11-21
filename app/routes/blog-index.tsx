import type { Route } from "./+types/blog-index";
import { BlogHeader, BlogLinks } from "../modules/blog/BlogLinks";
import { listPublicBlogPosts } from "../modules/blog/blog-repository.server";
import { cloudflareContext } from "../shared/cloudflare-context";
import "../modules/blog/blog.css";

const pageSize = 12;
export const headers = () => ({ "Cache-Control": "no-store" });
export const meta = () => [{ title: "Blog｜CMI Community" }, { name: "description", content: "来自 CMI Community 的活动回顾和社区文章。" }];

export async function loader({ context, request }: Route.LoaderArgs) {
  const { env } = context.get(cloudflareContext);
  const requested = Number(new URL(request.url).searchParams.get("page") ?? 1);
  const page = Number.isSafeInteger(requested) && requested > 0 && requested <= 10_000 ? requested : 1;
  const posts = await listPublicBlogPosts(env.DB, pageSize + 1, pageSize * (page - 1));
  return { page, hasNext: posts.length > pageSize, posts: posts.slice(0, pageSize) };
}

export default function BlogIndex({ loaderData: { posts, page, hasNext } }: Route.ComponentProps) {
  return <main className="blog-shell">
    <BlogHeader index />
    <header className="blog-index-intro">
      <h1>Blog</h1>
      <p>来自 CMI Community 的活动回顾与社区文章。</p>
    </header>
    {posts.length ? <BlogLinks posts={posts} /> : <p className="blog-empty">{page === 1 ? "博客文章发布后会在这里显示。" : "这一页没有文章。"}</p>}
    {(page > 1 || hasNext) && <nav className="blog-pages" aria-label="文章分页">
      {page > 1 && <a href={page === 2 ? "/blog" : "/blog?page=" + (page - 1)}>← 上一页</a>}
      {hasNext && <a href={"/blog?page=" + (page + 1)}>下一页 →</a>}
    </nav>}
  </main>;
}
