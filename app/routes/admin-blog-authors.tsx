import { useState, type FormEvent } from "react";
import type { Route } from "./+types/admin-blog-authors";
import { AdminShell } from "../modules/activities/AdminShell";
import { privateHeaders, requireAdminPage } from "../modules/activities/admin.server";
import { adminApi, errorMessage } from "../modules/activities/admin-client";
import { blogAdminApi, blogVersion } from "../modules/blog/blog-admin-client";
import { listBlogAuthors } from "../modules/blog/blog-repository.server";
import type { BlogAuthor } from "../modules/blog/blog-schema";
import { cloudflareContext } from "../shared/cloudflare-context";
import "../modules/blog/blog-admin.css";

export const headers = privateHeaders;
export const meta = () => [{ title: "博客作者｜CMI 社区后台" }];
export async function loader({ request, context }: Route.LoaderArgs) {
  const { env, ctx } = context.get(cloudflareContext);
  await requireAdminPage(request, env, ctx);
  return { environment: env.APP_ENV, authors: await listBlogAuthors(env.DB) };
}

function AuthorForm({ author, saved }: { author?: BlogAuthor; saved(author: BlogAuthor): void }) {
  const [name, setName] = useState(author?.displayName || "");
  const [active, setActive] = useState(author?.active ?? true);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setStatus("");
    setError("");
    try {
      const result = await adminApi<{ author: BlogAuthor }>(blogAdminApi + "/authors" + (author ? "/" + author.id : ""), {
        method: author ? "PUT" : "POST",
        headers: author ? blogVersion(author.version) : undefined,
        body: JSON.stringify({ displayName: name, active }),
      });
      saved(result.author);
      setName(author ? result.author.displayName : "");
      setActive(author ? result.author.active : true);
      setStatus(author ? "署名已保存。" : "作者已添加。");
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setBusy(false);
    }
  }
  return <form className="blog-author-form" onSubmit={event => void submit(event)} aria-label={author ? "编辑作者 " + author.displayName : "新建作者"}>
    <label>作者署名<input required maxLength={100} value={name} onChange={event => setName(event.target.value)} /></label>
    {author && <label className="blog-checkbox"><input type="checkbox" checked={active} onChange={event => setActive(event.target.checked)} />可用于新文章</label>}
    <button className={!author ? "event-admin__primary" : undefined} type="submit" disabled={busy}>{author ? "保存作者" : "添加作者"}</button>
    {status && <span role="status" className="blog-admin-note">{status}</span>}
    {error && <span role="alert" className="blog-admin-error">{error}</span>}
  </form>;
}

export default function AdminBlogAuthors({ loaderData }: Route.ComponentProps) {
  const [authors, setAuthors] = useState(loaderData.authors);
  function save(author: BlogAuthor) {
    setAuthors(list => {
      const exists = list.some(entry => entry.id === author.id);
      return exists ? list.map(entry => entry.id === author.id ? author : entry) : [...list, author];
    });
  }
  return <AdminShell title="博客作者" environment={loaderData.environment}>
    <p><a href="/admin/blog">← 博客文章</a></p>
    <p className="blog-admin-note">登记好的作者可以在文章编辑器中选择。停用后，旧文章保留署名。</p>
    <AuthorForm saved={save} />
    {authors.length > 0 && <section className="blog-author-list" aria-label="已登记作者">
      <h2>已登记作者</h2>
      {authors.map(author => <AuthorForm key={author.id} author={author} saved={save} />)}
    </section>}
  </AdminShell>;
}
