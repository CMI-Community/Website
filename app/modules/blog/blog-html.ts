import { parse, parseFragment, type DefaultTreeAdapterTypes } from "parse5";
import { normalizeBlogDocument, safeBlogLink, type BlogDocument, type BlogMark, type BlogNode } from "./blog-document";

type HtmlNode = DefaultTreeAdapterTypes.Node;
type HtmlElement = DefaultTreeAdapterTypes.Element;
type HtmlParent = DefaultTreeAdapterTypes.ParentNode;

const inline = new Set(["text", "hardBreak"]);
const ignored = new Set(["script", "style", "template", "noscript", "head", "meta", "link", "input", "form"]);
const embeds = new Set(["iframe", "video", "audio", "embed", "object", "mpvideo", "mpvoice", "mp-miniprogram", "mp-weapp", "mp-common-profile", "mpprofile", "mpvote", "wx-open-launch-weapp"]);
const blocks = new Set(["p", "div", "section", "article", "main", "header", "footer", "address", "dt", "dd", "aside"]);
export interface ImportedBlogImage { token: string; source: string }
export interface ImportedBlogBody { body: BlogDocument; images: ImportedBlogImage[] }

function attribute(el: HtmlElement, name: string): string {
  return el.attrs.find(attr => attr.name === name)?.value ?? "";
}

function* elements(root: HtmlNode): Generator<HtmlElement> {
  const queue = [root];
  while (queue.length) {
    const item = queue.pop()!;
    if ("tagName" in item) yield item;
    if ("childNodes" in item) {
      for (let i = item.childNodes.length - 1; i >= 0; i--) queue.push(item.childNodes[i]);
    }
  }
}

function textOf(root: HtmlNode): string {
  const text: string[] = [];
  const queue = [root];
  while (queue.length) {
    const item = queue.pop()!;
    if ("value" in item && item.nodeName === "#text") text.push(item.value as string);
    if ("childNodes" in item)
      for (let i = item.childNodes.length - 1; i >= 0; i--) queue.push(item.childNodes[i]);
  }
  return text.join("");
}

function markFor(el: HtmlElement, sourceUrl: string): BlogMark[] {
  const tag = el.tagName;
  const style = attribute(el, "style");
  const clean: BlogMark[] = [];
  if (["b", "strong"].includes(tag) || /font-weight\s*:\s*(bold|[7-9]00)\b/i.test(style)) clean.push({ type: "bold" });
  if (["i", "em"].includes(tag) || /font-style\s*:\s*italic\b/i.test(style)) clean.push({ type: "italic" });
  if (tag === "u" || /text-decoration(?:-line)?\s*:[^;]*\bunderline\b/i.test(style)) clean.push({ type: "underline" });
  if (["s", "del", "strike"].includes(tag) || /text-decoration(?:-line)?\s*:[^;]*\bline-through\b/i.test(style)) clean.push({ type: "strike" });
  if (tag === "code") clean.push({ type: "code" });
  if (tag === "a") {
    const raw = attribute(el, "href").trim();
    let href = safeBlogLink(raw);
    if (href?.startsWith("/") && sourceUrl) href = new URL(href, sourceUrl).href;
    if (href) clean.push({ type: "link", attrs: { href } });
  }
  return clean;
}

function asBlocks(nodes: BlogNode[], textType = "paragraph", attrs?: BlogNode["attrs"], preserveEmpty = false) {
  const result: BlogNode[] = [];
  let text: BlogNode[] = [];
  function flush() {
    if (text.some(node => node.text?.trim() || node.type === "hardBreak")) result.push({ type: textType, ...(attrs ? { attrs } : {}), content: text });
    text = [];
  }
  for (const node of nodes) {
    if (inline.has(node.type)) text.push(node);
    else {
      flush();
      result.push(node);
    }
  }
  flush();
  return result.length || !preserveEmpty ? result : [{ type: textType, ...(attrs ? { attrs } : {}) }];
}

function embedLabel(el: HtmlElement) {
  const descriptor = [el.tagName, attribute(el, "src"), attribute(el, "class")].join(" ");
  if (/miniapp|miniprogram|weapp/i.test(descriptor)) return "微信小程序";
  if (/voice|audio/i.test(descriptor)) return "音频";
  if (/video|vid=/i.test(descriptor)) return "视频";
  if (/vote/i.test(descriptor)) return "投票";
  return "微信原生内容";
}

function convert(root: HtmlParent, sourceUrl: string): ImportedBlogBody {
  const images: ImportedBlogImage[] = [];
  let visited = 0;

  function visitChildren(parent: HtmlParent, marks: BlogMark[], depth: number): BlogNode[] {
    return parent.childNodes.flatMap(child => visit(child, marks, depth + 1));
  }

  function visit(node: HtmlNode, marks: BlogMark[], depth: number): BlogNode[] {
    if (++visited > 32_000 || depth > 80) throw new Error("导入内容过大或嵌套过深。");
    if ("value" in node && node.nodeName === "#text") {
      const text = String(node.value).replace(/[\t\n\r\f ]+/g, " ");
      return text ? [{ type: "text", text, ...(marks.length ? { marks } : {}) }] : [];
    }
    if (!("tagName" in node)) return [];
    const tag = node.tagName;
    if (ignored.has(tag) || node.attrs.some(attr => attr.name === "hidden") || /display\s*:\s*none\b/i.test(attribute(node, "style"))) return [];
    if (embeds.has(tag)) return [{ type: "blogEmbed", attrs: { label: embedLabel(node), href: sourceUrl } }];
    if (tag === "img") {
      const token = crypto.randomUUID();
      const source = (attribute(node, "data-src") || attribute(node, "src")).trim();
      const alt = attribute(node, "alt").slice(0, 500);
      if (source) images.push({ token, source: source.startsWith("//") ? "https:" + source : source });
      return [{ type: "blogImage", attrs: { kind: "pending", ref: token, alt, caption: "" } }];
    }
    if (tag === "br") return [{ type: "hardBreak" }];
    if (tag === "hr") return [{ type: "horizontalRule" }];
    if (tag === "pre") {
      const text = textOf(node);
      return [{ type: "codeBlock", ...(text ? { content: [{ type: "text", text }] } : {}) }];
    }
    if (tag === "figure") {
      const caption = node.childNodes.find((child): child is HtmlElement => "tagName" in child && child.tagName === "figcaption");
      const children = node.childNodes.filter(child => child !== caption).flatMap(child => visit(child, marks, depth + 1));
      const image = children.find(child => child.type === "blogImage");
      if (caption && image?.attrs) image.attrs.caption = textOf(caption).trim().slice(0, 1000);
      else if (caption) children.push(...asBlocks(visitChildren(caption, marks, depth + 1), "paragraph"));
      return asBlocks(children);
    }
    if (tag === "table") {
      const rows = node.childNodes.flatMap(child => "tagName" in child && ["thead", "tbody", "tfoot"].includes(child.tagName) ? child.childNodes : [child]);
      const content = rows.flatMap(row => {
        if (!("tagName" in row) || row.tagName !== "tr") return [];
        const cells = row.childNodes.flatMap(cell => {
          if (!("tagName" in cell) || !["th", "td"].includes(cell.tagName)) return [];
          return [{
            type: cell.tagName === "th" ? "tableHeader" : "tableCell",
            attrs: {
              colspan: Math.max(1, Math.min(30, Number.parseInt(attribute(cell, "colspan"), 10) || 1)),
              rowspan: Math.max(1, Math.min(100, Number.parseInt(attribute(cell, "rowspan"), 10) || 1)),
              colwidth: null,
            },
            content: asBlocks(visitChildren(cell, marks, depth + 2), "paragraph", undefined, true),
          }];
        });
        return cells.length ? [{ type: "tableRow", content: cells }] : [];
      });
      const caption = node.childNodes.find((child): child is HtmlElement => "tagName" in child && child.tagName === "caption");
      const lead = caption ? asBlocks(visitChildren(caption, marks, depth)) : [];
      return content.length ? [...lead, { type: "table", content }] : [...lead, ...asBlocks(visitChildren(node, marks, depth))];
    }
    if (["ul", "ol"].includes(tag)) {
      const items = node.childNodes.flatMap(item => {
        if (!("tagName" in item) || item.tagName !== "li") return [];
        return [{ type: "listItem", content: asBlocks(visitChildren(item, marks, depth + 1), "paragraph", undefined, true) }];
      });
      if (!items.length) return asBlocks(visitChildren(node, marks, depth));
      return tag === "ul" ? [{ type: "bulletList", content: items }] : [{
        type: "orderedList", attrs: { start: Math.max(1, Math.min(100_000, Number.parseInt(attribute(node, "start"), 10) || 1)) }, content: items,
      }];
    }
    const combined = [...new Map([...marks, ...markFor(node, sourceUrl)].map(mark => [mark.type, mark])).values()];
    const children = visitChildren(node, combined, depth);
    if (tag === "blockquote") return [{ type: "blockquote", content: asBlocks(children, "paragraph", undefined, true) }];
    if (/^h[1-6]$/.test(tag)) return asBlocks(children, "heading", { level: Math.max(2, Math.min(4, Number(tag[1]))) }, true);
    if (blocks.has(tag) || tag === "figcaption") return asBlocks(children, "paragraph", undefined, tag === "p");
    return children;
  }

  const body = normalizeBlogDocument({ type: "doc", content: asBlocks(visitChildren(root, [], 0)) });
  return { body, images };
}

export function importBlogClipboard(html: string, sourceUrl = "") {
  if (html.length > 20 * 1024 * 1024) throw new Error("剪贴板内容过大，请分次粘贴。");
  return convert(parseFragment(html), sourceUrl);
}

export function parseWeChatPage(html: string, sourceUrl: string) {
  const doc = parse(html);
  const nodes = [...elements(doc)];
  const byId = (id: string) => nodes.find(el => attribute(el, "id") === id);
  const meta = (property: string) => {
    const found = nodes.find(el => el.tagName === "meta" && [attribute(el, "property"), attribute(el, "name")].includes(property));
    return found ? attribute(found, "content") : "";
  };
  const body = byId("js_content");
  const titleNode = byId("activity-name");
  const title = (meta("og:title") || (titleNode ? textOf(titleNode) : "")).trim();
  const dateNode = byId("publish_time");
  let displayDate = (dateNode ? textOf(dateNode) : meta("article:published_time")).trim().match(/^\d{4}-\d{2}-\d{2}/)?.[0] || "";
  if (!displayDate) {
    const epoch = html.match(/\b(?:var\s+)?ct\s*=\s*["'](\d{10})["']/)?.[1];
    if (epoch) displayDate = new Date(Number(epoch) * 1000 + 8 * 3600_000).toISOString().slice(0, 10);
  }
  if (!body || !title) return null;
  const imported = convert(body, sourceUrl);
  if (!textOf(body).trim() && !imported.images.length) return null;
  return { ...imported, title: title.slice(0, 240), displayDate, summary: meta("og:description").trim().slice(0, 800) };
}
