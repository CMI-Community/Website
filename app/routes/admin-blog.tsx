import type { Route } from "./+types/admin-blog";
import { AdminShell } from "../modules/activities/AdminShell";
import { privateHeaders, requireAdminPage } from "../modules/activities/admin.server";
import { listBlogDrafts } from "../modules/blog/blog-repository.server";
import { blogPostPath } from "../modules/blog/blog-schema";
import { cloudflareContext } from "../shared/cloudflare-context";
import "../modules/blog/blog-admin.css";

export const headers = privateHeaders;
export const meta = () => [{ title: "博客文章｜CMI 社区后台" }];
export async function loader({ request, context }: Route.LoaderArgs) {
  const { env, ctx } = context.get(cloudflareContext);
  await requireAdminPage(request, env, ctx);
  return { environment: env.APP_ENV, posts: await listBlogDrafts(env.DB) };
}
export default function AdminBlog({ loaderData: { posts, environment } }: Route.ComponentProps) {
  return <AdminShell title="博客文章" environment={environment}>
    <nav className="blog-admin-actions" aria-label="博客管理">
      <a className="event-admin__primary" href="/admin/blog/new">新建文章</a>
      <a href="/admin/blog/authors">博客作者</a>
      <a href="/blog">查看 Blog ↗</a>
    </nav>
    {posts.length ? <ul className="blog-admin-list">
      {posts.map(post => <li key={post.id}>
        <div><h2><a href={"/admin/blog/" + post.id}>{post.title || "未命名文章"}</a></h2>
          <p>{post.displayDate} · {post.author || "待选择作者"} · {post.revisionId ? "已发布" : post.hasPublication ? "已下架" : "草稿"}</p></div>
        {post.revisionId && <a href={blogPostPath(post.shortId)}>公开全文 ↗</a>}
      </li>)}
    </ul> : <p className="blog-admin-note">第一篇文章可以从新建文章开始。</p>}
  </AdminShell>;
}
