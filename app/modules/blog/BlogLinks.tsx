import { blogPostPath, type BlogSummary } from "./blog-schema";

export function BlogByline({ post }: { post: BlogSummary }) {
  return <p className="blog-byline"><time dateTime={post.displayDate}>{post.displayDate}</time><span>{post.author}</span></p>;
}

export function BlogLinks({ posts }: { posts: BlogSummary[] }) {
  return <ul className="blog-links">
    {posts.map(post => <li key={post.slug} lang={post.locale}>
      <BlogByline post={post} />
      <h3><a href={blogPostPath(post.slug)}>{post.title}</a></h3>
      {post.summary && <p className="blog-links__summary">{post.summary}</p>}
    </li>)}
  </ul>;
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
