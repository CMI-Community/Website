import type { ReactNode } from "react";
import { safeBlogLink, type BlogDocument, type BlogNode } from "./blog-document";
import type { BlogImage, BlogLocale } from "./blog-schema";

export type BlogInlineImage = Omit<BlogImage, "id"> & { alt?: string };
export type ResolveBlogImage = (kind: string, id: string) => BlogInlineImage | undefined;

export function BlogBody({ body, sourceUrl, resolveImage, locale, preview = false }: {
  body: BlogDocument;
  sourceUrl?: string | null;
  resolveImage: ResolveBlogImage;
  locale: BlogLocale;
  preview?: boolean;
}) {
  const english = locale === "en";
  function render(node: BlogNode, key: number): ReactNode {
    if (node.type === "text") {
      return (node.marks ?? []).reduce<ReactNode>((text, mark, index) => {
        switch (mark.type) {
          case "bold": return <strong key={index}>{text}</strong>;
          case "italic": return <em key={index}>{text}</em>;
          case "underline": return <u key={index}>{text}</u>;
          case "strike": return <s key={index}>{text}</s>;
          case "code": return <code key={index}>{text}</code>;
          case "link": {
            const href = safeBlogLink(mark.attrs?.href);
            return href ? <a key={index} href={href}>{text}</a> : text;
          }
          default: return text;
        }
      }, node.text);
    }
    const content = node.content?.map((child, index) => <Part key={index}>{render(child, index)}</Part>);
    switch (node.type) {
      case "paragraph": return <p key={key}>{content?.length ? content : <br />}</p>;
      case "heading": {
        const Heading = node.attrs?.level === 4 ? "h4" : node.attrs?.level === 3 ? "h3" : "h2";
        return <Heading key={key}>{content}</Heading>;
      }
      case "blockquote": return <blockquote key={key}>{content}</blockquote>;
      case "bulletList": return <ul key={key}>{content}</ul>;
      case "orderedList": return <ol key={key} start={Number(node.attrs?.start) || 1}>{content}</ol>;
      case "listItem": return <li key={key}>{content}</li>;
      case "codeBlock": return <pre key={key}><code>{content}</code></pre>;
      case "hardBreak": return <br key={key} />;
      case "horizontalRule": return <hr key={key} />;
      case "table": return <div className="blog-prose__table" key={key}><table><tbody>{content}</tbody></table></div>;
      case "tableRow": return <tr key={key}>{content}</tr>;
      case "tableCell":
      case "tableHeader": {
        const Cell = node.type === "tableHeader" ? "th" : "td";
        return <Cell key={key} colSpan={Number(node.attrs?.colspan) || 1} rowSpan={Number(node.attrs?.rowspan) || 1}>{content}</Cell>;
      }
      case "blogImage": {
        const image = resolveImage(String(node.attrs?.kind), String(node.attrs?.ref));
        if (!image) return preview ? <p className="blog-prose__embed" key={key}>图片待补传</p> : null;
        const caption = String(node.attrs?.caption || "");
        return <figure key={key}>
          <img src={image.url} alt={String(node.attrs?.alt || image.alt || "")} width={image.width || undefined} height={image.height || undefined} loading="lazy" decoding="async" />
          {caption && <figcaption>{caption}</figcaption>}
        </figure>;
      }
      case "blogEmbed": {
        const href = safeBlogLink(node.attrs?.href) || safeBlogLink(sourceUrl);
        const label = String(node.attrs?.label || (english ? "WeChat content" : "微信内容"));
        return <p className="blog-prose__embed" key={key}>
          <span>{label}</span>
          {href && <a href={href} target="_blank" rel="noreferrer">{english ? "View on WeChat" : "查看公众号原文"} ↗</a>}
        </p>;
      }
      default: return content;
    }
  }
  return <div className="blog-prose" lang={locale}>{body.content.map((node, index) => <Part key={index}>{render(node, index)}</Part>)}</div>;
}

function Part({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
