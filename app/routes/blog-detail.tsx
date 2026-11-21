import { useEffect, useRef, useState } from "react";
import { data, isRouteErrorResponse, useRouteError } from "react-router";
import type { Route } from "./+types/blog-detail";
import { loadPublicBlog } from "../modules/blog/blog-repository.server";
import { BlogHeader, BlogByline } from "../modules/blog/BlogLinks";
import { BlogBody } from "../modules/blog/BlogBody";
import { blogPostPath, type BlogLocale } from "../modules/blog/blog-schema";
import type { TranslatedBlogText } from "../modules/blog/blog-translation";
import { ContentGallery } from "../modules/community-content/content-gallery";
import { cloudflareContext } from "../shared/cloudflare-context";
import "../modules/community-content/content.css";
import "../modules/blog/blog.css";

export const headers = () => ({ "Cache-Control": "no-store" });
export function meta({ loaderData }: Route.MetaArgs) {
  const post = loaderData?.post;
  return [
    { title: post ? post.title + "｜CMI Community" : "Blog｜CMI Community" },
    { name: "description", content: post?.summary || "CMI Community Blog" },
    ...(post ? [{ property: "og:type", content: "article" }, { property: "og:title", content: post.title }] : []),
  ];
}
export async function loader({ context, params }: Route.LoaderArgs) {
  const { env } = context.get(cloudflareContext);
  const post = await loadPublicBlog(env, params.slug);
  if (!post) throw data("文章不存在或已下架。", { status: 404 });
  return { post };
}

function ArticleView({ post }: { post: NonNullable<Awaited<ReturnType<typeof loadPublicBlog>>> }) {
  const [translated, setTranslated] = useState<TranslatedBlogText | null>(null);
  const [showTranslation, setShowTranslation] = useState(false);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [error, setError] = useState("");
  const operation = useRef<AbortController | null>(null);
  useEffect(() => () => operation.current?.abort(), []);
  const viewing = showTranslation && translated ? translated : post;
  const english = viewing.locale === "en";
  const target: BlogLocale = post.locale === "en" ? "zh-CN" : "en";
  const images = new Map(post.images.map(image => [image.id, image]));
  const photos = new Map(post.photos.map(photo => [photo.id, photo]));

  async function switchLanguage() {
    if (operation.current) return;
    if (translated) {
      setShowTranslation(value => !value);
      return;
    }
    const controller = new AbortController();
    operation.current = controller;
    setError("");
    setProgress({ done: 0, total: 0 });
    const timeout = Date.now() + 6 * 60_000;
    try {
      while (Date.now() < timeout) {
        const response = await fetch("/api/v1" + blogPostPath(post.slug) + "/translation", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ revision: post.revisionId, target }),
          signal: controller.signal,
        });
        const payload = await response.json() as Partial<TranslatedBlogText> & { done?: number; total?: number; error?: { message?: string } };
        if (response.status === 202) {
          setProgress({ done: payload.done ?? 0, total: payload.total ?? 0 });
          await new Promise(resolve => setTimeout(resolve, 1100));
          continue;
        }
        if (!response.ok) throw new Error(post.locale === "en"
          ? "Could not finish the translation. Try again in a moment."
          : payload.error?.message || "暂时无法完成翻译，请稍后重试。");
        if (payload.revisionId !== post.revisionId || payload.locale !== target) throw new Error();
        setTranslated(payload as TranslatedBlogText);
        setShowTranslation(true);
        return;
      }
      throw new Error();
    } catch (cause) {
      if (!controller.signal.aborted) setError(cause instanceof Error && cause.message
        ? cause.message
        : post.locale === "en" ? "Could not finish the translation. Try again in a moment." : "暂时无法完成翻译，请稍后重试。");
    } finally {
      if (operation.current === controller) {
        operation.current = null;
        if (!controller.signal.aborted) setProgress(null);
      }
    }
  }

  return <main className="blog-shell">
    <BlogHeader english={english} />
    <article className="blog-article" lang={viewing.locale}>
      <header className="blog-article__heading">
        <BlogByline post={post} />
        <h1>{viewing.title}</h1>
        {viewing.summary && <p className="blog-article__intro">{viewing.summary}</p>}
        <div className="blog-language">
          <button type="button" disabled={Boolean(progress)} onClick={() => void switchLanguage()}>
            {showTranslation ? (english ? "View original" : "查看原文") : target === "en" ? "English" : "简体中文"}
          </button>
          {showTranslation && <span>{english ? "Automatic translation" : "自动翻译"}</span>}
          {progress && <span role="status">{english ? "Translating" : "正在翻译"}{progress.total > 1 ? ` · ${progress.done}/${progress.total}` : ""}…</span>}
        </div>
        {error && <p className="blog-status" role="alert">{error}</p>}
      </header>
      <BlogBody body={viewing.body} sourceUrl={post.sourceUrl} locale={viewing.locale}
        resolveImage={(kind, id) => kind === "photo" ? photos.get(id) : images.get(id)} />
      {post.sourceUrl && <p className="blog-source"><a href={post.sourceUrl} target="_blank" rel="noreferrer">{english ? "Read the original on WeChat" : "查看公众号原文"} ↗</a></p>}
      {(post.series.length > 0 || post.events.length > 0 || post.gallery.length > 0) && <aside className="blog-related" aria-label={english ? "Related community content" : "相关社区内容"}>
        {!!post.series.length && <section><h2>{english ? "Series" : "相关系列"}</h2><ul>{post.series.map(series => <li key={series.slug}><a href={"/series/" + encodeURIComponent(series.slug)}>{series.name}</a></li>)}</ul></section>}
        {!!post.events.length && <section><h2>{english ? "Events" : "相关活动"}</h2><ul>{post.events.map((event, i) => <li key={event.href + i}><a href={event.href}>{event.title}</a></li>)}</ul></section>}
        {!!post.gallery.length && <section><h2>{english ? "Photos" : "相关照片"}</h2><ContentGallery photos={post.gallery} /></section>}
      </aside>}
    </article>
  </main>;
}

export default function BlogDetail({ loaderData }: Route.ComponentProps) {
  return <ArticleView key={loaderData.post.revisionId} post={loaderData.post} />;
}

export function ErrorBoundary() {
  const reason = useRouteError();
  const missing = isRouteErrorResponse(reason) && reason.status === 404;
  return <main className="blog-shell"><BlogHeader /><section className="blog-empty">
    <h1>{missing ? "文章暂不可用" : "暂时无法加载文章"}</h1>
    <a href="/blog">← 返回 Blog</a>
  </section></main>;
}
