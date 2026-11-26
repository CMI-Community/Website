import { useState } from "react";
import { blogPostPath, type BlogListingItem, type BlogSummary } from "./blog-schema";

export function BlogByline({ post }: { post: Pick<BlogSummary, "displayDate" | "author"> }) {
  return <p className="blog-byline"><time dateTime={post.displayDate}>{post.displayDate}</time><span>{post.author}</span></p>;
}

export function BlogLinks({ posts }: { posts: BlogSummary[] }) {
  return <ul className="blog-links">
    {posts.map(post => <li key={post.shortId} lang={post.locale}>
      <BlogByline post={post} />
      <h3><a href={blogPostPath(post.shortId)}>{post.title}</a></h3>
      {post.summary && <p className="blog-links__summary">{post.summary}</p>}
    </li>)}
  </ul>;
}

export function BlogStoryList({ posts }: { posts: BlogListingItem[] }) {
  return <ul className="blog-story-list">
    {posts.map((post, index) => {
      const titleId = "blog-story-" + post.shortId;
      return <li key={post.shortId} lang={post.locale}>
        <a className="blog-story" href={blogPostPath(post.shortId)} aria-labelledby={titleId}>
          {post.cover && <span className="blog-story__picture">
            <img src={post.cover.url} width={post.cover.width} height={post.cover.height} alt=""
              loading={index ? "lazy" : "eager"} decoding="async" />
          </span>}
          <div className="blog-story__copy">
            <BlogByline post={post} />
            <h2 id={titleId}>{post.title}</h2>
            {post.summary && <p className="blog-story__summary">{post.summary}</p>}
            <span className="blog-story__read" aria-hidden="true">{post.locale === "en" ? "Read article" : "阅读全文"} <span>↗</span></span>
          </div>
        </a>
      </li>;
    })}
  </ul>;
}

export function BlogCopyLink({ shortId, english = false }: { shortId: number; english?: boolean }) {
  const [message, setMessage] = useState("");
  async function copyLink() {
    try {
      await navigator.clipboard.writeText(new URL(blogPostPath(shortId), window.location.origin).href);
      setMessage(english ? "Link copied" : "短链接已复制");
    } catch {
      setMessage(english ? "Open the article and copy its address." : "请打开文章，从地址栏复制短链接。");
    }
  }
  return <>
    <button type="button" onClick={() => void copyLink()}>{english ? "Copy link" : "复制短链接"}</button>
    <span role="status" className="blog-copy-message">{message}</span>
  </>;
}

export function BlogHeader({ index = false, english = false }: { index?: boolean; english?: boolean }) {
  return <header className="blog-header">
    <a className="blog-header__brand" href="/">
      <img src="/brand/cmi-community-logo.png" width="32" height="32" alt="" />
      <span>CMI Community</span>
    </a>
    <nav aria-label={english ? "Blog navigation" : "博客导航"}>
      {!index && <a href="/blog">Blog</a>}
      <a href="/series">{english ? "Series" : "系列"}</a>
    </nav>
  </header>;
}
