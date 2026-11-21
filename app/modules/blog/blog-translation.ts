import type { BlogDocument, BlogNode } from "./blog-document";
import type { BlogLocale } from "./blog-schema";

export interface BlogText {
  title: string;
  summary: string;
  body: BlogDocument;
}
export interface BlogTextSegment { id: string; text: string }
export interface TranslatedBlogText extends BlogText { locale: BlogLocale; revisionId: string }

const maxSegment = 1800;
const maxChunk = 5000;

function splitText(text: string): string[] {
  if (text.length <= maxSegment) return [text];
  const parts: string[] = [];
  let remaining = text;
  while (remaining.length > maxSegment) {
    const window = remaining.slice(0, maxSegment);
    const boundary = Math.max(window.lastIndexOf("。"), window.lastIndexOf(". "), window.lastIndexOf(" "), window.lastIndexOf("、"));
    let end = boundary >= maxSegment / 2 ? boundary + 1 : maxSegment;
    const code = remaining.charCodeAt(end - 1);
    if (code >= 0xd800 && code <= 0xdbff) end--;
    parts.push(remaining.slice(0, end));
    remaining = remaining.slice(end);
  }
  parts.push(remaining);
  return parts;
}

function visitText(source: BlogText, register: (text: string, set: (text: string) => void) => void) {
  register(source.title, value => { source.title = value; });
  register(source.summary, value => { source.summary = value; });
  function visit(node: BlogNode) {
    // Code examples are kept intact while natural-language text around them is translated.
    if (node.type === "codeBlock") return;
    if (node.type === "text" && node.text !== undefined && !node.marks?.some(mark => mark.type === "code")) {
      register(node.text, value => { node.text = value; });
    }
    const attrs = node.attrs;
    if (attrs && (node.type === "blogImage" || node.type === "blogEmbed")) {
      for (const attr of node.type === "blogImage" ? ["alt", "caption"] : ["label"]) {
        const value = attrs[attr];
        if (typeof value === "string") register(value, text => { attrs[attr] = text; });
      }
    }
    node.content?.forEach(visit);
  }
  visit(source.body);
}

export function prepareBlogTranslation(post: BlogText) {
  const text = { title: post.title, summary: post.summary, body: structuredClone(post.body) };
  const chunks: BlogTextSegment[][] = [];
  const edits: { ids: string[]; set: (newText: string) => void }[] = [];
  let chunk: BlogTextSegment[] = [];
  let size = 0;
  let index = 0;
  visitText(text, (source, set) => {
    if (!source.trim()) return;
    const ids: string[] = [];
    for (const part of splitText(source)) {
      const id = String(index++);
      if (chunk.length >= 70 || size + part.length > maxChunk) {
        chunks.push(chunk);
        chunk = [];
        size = 0;
      }
      chunk.push({ id, text: part });
      size += part.length;
      ids.push(id);
    }
    edits.push({ ids, set });
  });
  if (chunk.length) chunks.push(chunk);

  return {
    chunks,
    apply(translations: BlogTextSegment[][]): BlogText {
      const result = new Map(translations.flat().map(entry => [entry.id, entry.text]));
      for (const edit of edits) {
        const merged = edit.ids.map(id => {
          const translated = result.get(id);
          if (translated === undefined) throw new Error("Incomplete blog translation");
          return translated;
        }).join("");
        edit.set(merged);
      }
      return text;
    },
  };
}

export function completeTranslationChunk(source: BlogTextSegment[], result: unknown): BlogTextSegment[] | null {
  if (!Array.isArray(result) || source.length !== result.length) return null;
  const expected = new Map(source.map(item => [item.id, item.text]));
  const output: BlogTextSegment[] = [];
  for (const item of result) {
    if (!item || typeof item.id !== "string" || typeof item.text !== "string") return null;
    const original = expected.get(item.id);
    if (original === undefined || (original.trim() && !item.text.trim()) || item.text.length > 12_000) return null;
    expected.delete(item.id);
    output.push({ id: item.id, text: item.text });
  }
  return output;
}
