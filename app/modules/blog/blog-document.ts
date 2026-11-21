import { z } from "zod";

const key = z.string().regex(/^[a-zA-Z0-9_.-]{1,160}$/);
const rawNode = z.object({
  type: z.string(),
  text: z.string().optional(),
  attrs: z.record(z.string(), z.unknown()).optional(),
  marks: z.array(z.object({
    type: z.string(),
    attrs: z.record(z.string(), z.unknown()).optional(),
  })).max(8).optional(),
  content: z.array(z.unknown()).optional(),
});
const imageAttrs = z.object({
  kind: z.enum(["upload", "photo", "pending"]),
  ref: key,
  alt: z.string().max(500).default(""),
  caption: z.string().max(1000).default(""),
});
const embedAttrs = z.object({ label: z.string().min(1).max(150), href: z.string().max(2048).default("") });
const textBlocks = ["paragraph", "heading", "codeBlock"] as const;
const blocks = [...textBlocks, "blockquote", "bulletList", "orderedList", "horizontalRule", "blogImage", "blogEmbed", "table"] as const;
const inline = ["text", "hardBreak"];
const allowedChildren: Readonly<Record<string, readonly string[]>> = {
  doc: blocks,
  paragraph: inline,
  heading: inline,
  codeBlock: ["text"],
  blockquote: blocks,
  bulletList: ["listItem"],
  orderedList: ["listItem"],
  listItem: blocks,
  table: ["tableRow"],
  tableRow: ["tableCell", "tableHeader"],
  tableCell: blocks,
  tableHeader: blocks,
};
const marks = new Set(["bold", "italic", "strike", "underline", "code", "link"]);

export type BlogImageAttributes = z.infer<typeof imageAttrs>;
export interface BlogMark {
  type: string;
  attrs?: { href: string };
}
export interface BlogNode {
  type: string;
  text?: string;
  attrs?: Record<string, string | number | number[] | null>;
  marks?: BlogMark[];
  content?: BlogNode[];
}
export interface BlogDocument extends BlogNode {
  type: "doc";
  content: BlogNode[];
}
export const emptyBlogDocument: BlogDocument = { type: "doc", content: [{ type: "paragraph" }] };
export const imageTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"] as const;
export const blogImageMaxBytes = 10 * 1024 * 1024;

export function safeBlogLink(value: unknown): string | null {
  if (typeof value !== "string" || !value || value.length > 2048 || /[\x00-\x20\\]/.test(value)) return null;
  if (value.startsWith("#") || (value.startsWith("/") && !value.startsWith("//"))) return value;
  try {
    const url = new URL(value);
    return ["https:", "http:", "mailto:"].includes(url.protocol) && !url.username && !url.password ? value : null;
  } catch {
    return null;
  }
}

function normalizeAttrs(node: z.infer<typeof rawNode>): BlogNode["attrs"] {
  switch (node.type) {
    case "heading":
      return { level: z.number().int().min(2).max(4).parse(node.attrs?.level ?? 2) };
    case "orderedList":
      return { start: z.number().int().min(1).max(100_000).parse(node.attrs?.start ?? 1) };
    case "blogImage":
      return imageAttrs.parse(node.attrs);
    case "blogEmbed": {
      const { label, href } = embedAttrs.parse(node.attrs);
      return { label, href: safeBlogLink(href) || "" };
    }
    case "tableCell":
    case "tableHeader":
      return z.object({
        colspan: z.number().int().min(1).max(30).default(1),
        rowspan: z.number().int().min(1).max(100).default(1),
        colwidth: z.array(z.number().int().min(0).max(2400)).max(30).nullable().default(null),
      }).parse(node.attrs ?? {});
  }
}

export function normalizeBlogDocument(value: unknown): BlogDocument {
  let nodes = 0;
  let textLength = 0;
  let imageCount = 0;

  function visit(raw: unknown, types: readonly string[], depth: number): BlogNode {
    if (++nodes > 7000 || depth > 24) throw new Error("正文结构过长或嵌套过深。");
    const node = rawNode.parse(raw);
    if (!types.includes(node.type)) throw new Error("正文包括无法保存的格式。");
    if (node.type === "text") {
      if (!node.text) throw new Error("正文文字节点为空。");
      textLength += node.text.length;
      const cleanMarks = (node.marks ?? []).flatMap<BlogMark>(mark => {
        if (!marks.has(mark.type)) return [];
        if (mark.type !== "link") return [{ type: mark.type }];
        const href = safeBlogLink(mark.attrs?.href);
        return href ? [{ type: "link", attrs: { href } }] : [];
      });
      return { type: "text", text: node.text, ...(cleanMarks.length ? { marks: cleanMarks } : {}) };
    }
    if (node.type === "blogImage") imageCount++;
    const attrs = normalizeAttrs(node);
    const children = allowedChildren[node.type];
    const content = children ? (node.content ?? []).map(child => visit(child, children, depth + 1)) : [];
    if (["doc", "blockquote", "tableCell", "tableHeader"].includes(node.type) && !content.length)
      content.push({ type: "paragraph" });
    if (node.type === "listItem" && content[0]?.type !== "paragraph") content.unshift({ type: "paragraph" });
    if (["bulletList", "orderedList", "table", "tableRow"].includes(node.type) && !content.length)
      throw new Error("正文包括空列表或空表格。");
    return { type: node.type, ...(attrs ? { attrs } : {}), ...(content.length ? { content } : {}) };
  }

  const doc = visit(value, ["doc"], 0) as BlogDocument;
  if (textLength > 80_000 || imageCount > 160 || new TextEncoder().encode(JSON.stringify(doc)).byteLength > 750_000)
    throw new Error("单篇文章支持 8 万字、160 张正文图片以及 750 KB 的正文结构。");
  return doc;
}

export function walkBlog(node: BlogNode, visit: (item: BlogNode) => void): void {
  visit(node);
  node.content?.forEach(child => walkBlog(child, visit));
}
