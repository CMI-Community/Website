import { Node } from "@tiptap/core";
import { EditorContent, NodeViewWrapper, ReactNodeViewRenderer, useEditor, type Editor, type NodeViewProps } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { TableKit } from "@tiptap/extension-table";
import { useEffect, useImperativeHandle, useRef, useState, type Ref } from "react";
import { errorMessage } from "../activities/admin-client";
import { blogAdminApi, uploadEditorImage, uploadImportedImage } from "./blog-admin-client";
import { imageTypes, normalizeBlogDocument, safeBlogLink, type BlogDocument, type BlogImageAttributes } from "./blog-document";
import { importBlogClipboard, type ImportedBlogBody } from "./blog-html";
import type { BlogImage } from "./blog-schema";

type EditorPhoto = BlogImage & { alt: string };
export interface BlogEditorActions {
  insertImported(imported: ImportedBlogBody): Promise<number>;
  insertPhoto(id: string): void;
}
interface EditorProps {
  initial: BlogDocument;
  disabled: boolean;
  sourceUrl: string;
  photos: EditorPhoto[];
  onChange(body: BlogDocument): void;
  onPendingChange(delta: number): void;
  ref?: Ref<BlogEditorActions>;
}

function pendingNode(token: string): { type: "blogImage"; attrs: BlogImageAttributes } {
  return { type: "blogImage", attrs: { kind: "pending", ref: token, alt: "", caption: "" } };
}

function resolvePendingImage(editor: Editor, token: string, image: BlogImage) {
  if (editor.isDestroyed) return;
  const { tr } = editor.state;
  editor.state.doc.descendants((node, pos) => {
    if (node.type.name === "blogImage" && node.attrs.kind === "pending" && node.attrs.ref === token)
      tr.setNodeMarkup(pos, undefined, { ...node.attrs, kind: "upload", ref: image.id });
  });
  if (tr.docChanged) editor.view.dispatch(tr);
}

function PhotoNode({ props, photos, onPending }: {
  props: NodeViewProps; photos: EditorPhoto[]; onPending(delta: number): void;
}) {
  const { node, editor, selected, updateAttributes, deleteNode } = props;
  const attrs = node.attrs as BlogImageAttributes;
  const photo = attrs.kind === "photo" ? photos.find(item => item.id === attrs.ref) : null;
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const url = attrs.kind === "upload" ? blogAdminApi + "/images/" + attrs.ref : photo?.url;
  async function upload(file?: File) {
    if (!file) return;
    setBusy(true);
    onPending(1);
    setError("");
    try {
      const image = await uploadEditorImage(file);
      updateAttributes({ kind: "upload", ref: image.id });
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setBusy(false);
      onPending(-1);
    }
  }
  return <NodeViewWrapper as="figure" contentEditable={false} className={"blog-editor-image" + (selected ? " is-selected" : "")}>
    {url ? <img src={url} alt={attrs.alt || photo?.alt || ""} loading="lazy" />
      : <label>图片待补传<input aria-label="补传图片" type="file" disabled={busy || !editor.isEditable} accept={imageTypes.join(",")} onChange={event => void upload(event.target.files?.[0])} /></label>}
    {busy && <small role="status">正在上传…</small>}
    {error && <small role="alert">{error}</small>}
    <label>图片说明<input value={attrs.alt} placeholder="供屏幕阅读器使用" maxLength={500} onChange={event => updateAttributes({ alt: event.target.value })} /></label>
    <label>图注<input value={attrs.caption} maxLength={1000} onChange={event => updateAttributes({ caption: event.target.value })} /></label>
    <button type="button" onClick={deleteNode}>移除图片</button>
  </NodeViewWrapper>;
}

const embedNode = Node.create({
  name: "blogEmbed",
  group: "block",
  atom: true,
  addAttributes() { return { label: { default: "微信原生内容" }, href: { default: "" } }; },
  renderHTML({ node }) {
    return ["div", { "data-blog-embed": "", class: "blog-prose__embed" }, node.attrs.label + " · 查看公众号原文"];
  },
});

function imageNode(photos: EditorPhoto[], onPending: (delta: number) => void) {
  return Node.create({
    name: "blogImage",
    group: "block",
    atom: true,
    draggable: true,
    addAttributes() {
      return { kind: { default: "pending" }, ref: { default: "" }, alt: { default: "" }, caption: { default: "" } };
    },
    renderHTML({ node }) {
      return ["figure", { "data-blog-image": "" }, node.attrs.caption || node.attrs.alt || "图片"];
    },
    addNodeView() {
      return ReactNodeViewRenderer(props => <PhotoNode props={props} photos={photos} onPending={onPending} />);
    },
  });
}

async function resolveImported(
  editor: Editor,
  imported: ImportedBlogBody,
  onPending: (delta: number) => void,
  clipboardFiles: File[] = [],
) {
  const byToken = new Map(imported.images.map(item => [item.token, item.source]));
  const tokens: string[] = [];
  const scan = (node: BlogDocument | BlogDocument["content"][number]) => {
    if (node.type === "blogImage" && node.attrs?.kind === "pending") tokens.push(String(node.attrs.ref));
    node.content?.forEach(scan);
  };
  scan(imported.body);
  let missed = 0;
  onPending(tokens.length);
  // Process large clipboard images one at a time to keep browser/Worker memory bounded.
  for (const token of tokens) {
    const source = byToken.get(token) || "";
    try {
      const file = /^https:|^data:image/i.test(source) ? undefined : clipboardFiles.shift();
      const image = file ? await uploadEditorImage(file) : await uploadImportedImage(source);
      resolvePendingImage(editor, token, image);
    } catch {
      missed++;
    } finally {
      onPending(-1);
    }
  }
  return missed;
}

export function BlogEditor({ initial, photos, disabled, sourceUrl, onChange, onPendingChange, ref }: EditorProps) {
  const [notice, setNotice] = useState("");
  const [link, setLink] = useState("");
  const linkInput = useRef<HTMLInputElement>(null);
  const current = useRef({ sourceUrl, onChange, onPendingChange });
  useEffect(() => { current.current = { sourceUrl, onChange, onPendingChange }; }, [sourceUrl, onChange, onPendingChange]);
  function insertFiles(editor: Editor, files: File[]) {
    if (!files.length) return;
    const entries = files.map(file => ({ file, token: crypto.randomUUID() }));
    editor.chain().focus().insertContent(entries.map(({ token }) => pendingNode(token))).run();
    current.current.onPendingChange(entries.length);
    void (async () => {
      let missed = 0;
      for (const entry of entries) {
        try {
          resolvePendingImage(editor, entry.token, await uploadEditorImage(entry.file));
        } catch {
          missed++;
        } finally {
          current.current.onPendingChange(-1);
        }
      }
      if (missed) setNotice(`${missed} 张图片待补传。`);
    })();
  }

  const editor = useEditor({
    immediatelyRender: false,
    content: initial,
    extensions: [
      StarterKit.configure({ heading: { levels: [2, 3, 4] }, link: { openOnClick: false, autolink: false, linkOnPaste: false } }),
      TableKit.configure({ table: { resizable: false } }),
      imageNode(photos, onPendingChange),
      embedNode,
    ],
    editorProps: {
      attributes: { role: "textbox", "aria-label": "文章正文", "aria-multiline": "true", class: "blog-prose blog-editor__input" },
      handlePaste(view, event) {
        const html = event.clipboardData?.getData("text/html");
        const files = Array.from(event.clipboardData?.files ?? []).filter(file => file.type.startsWith("image/"));
        if (!html && !files.length) return false;
        event.preventDefault();
        if (!editor) return true;
        if (!html) {
          insertFiles(editor, files);
          return true;
        }
        try {
          const imported = importBlogClipboard(html, safeBlogLink(current.current.sourceUrl) || "");
          editor.chain().focus().insertContent(imported.body.content).run();
          void resolveImported(editor, imported, current.current.onPendingChange, files).then(missed => {
            setNotice(missed ? `已粘贴图文，${missed} 张图片待补传。` : "已粘贴图文。");
          });
        } catch (cause) {
          // Keep the editor writable even when a rich source uses unsupported structure.
          const plain = event.clipboardData?.getData("text/plain");
          if (plain) {
            view.dispatch(view.state.tr.insertText(plain));
            setNotice("已粘贴纯文字。图文结构无法识别，可把原文分段粘贴。");
          } else setNotice(errorMessage(cause));
        }
        return true;
      },
    },
    onUpdate({ editor }) {
      try {
        current.current.onChange(normalizeBlogDocument(editor.getJSON()));
      } catch (cause) {
        // The page still tracks the current edit and validates it before saving.
        current.current.onChange(editor.getJSON() as BlogDocument);
        setNotice(errorMessage(cause));
      }
    },
  });
  useEffect(() => { editor?.setEditable(!disabled, false); }, [editor, disabled]);
  useImperativeHandle(ref, () => ({
    async insertImported(imported) {
      if (!editor || editor.isDestroyed) throw new Error("正文编辑器正在加载。");
      const content = editor.getJSON();
      const empty = content.content?.length === 1 && content.content[0].type === "paragraph" && !content.content[0].content?.length;
      if (empty) editor.commands.setContent(imported.body);
      else editor.chain().focus("end").insertContent(imported.body.content).run();
      return resolveImported(editor, imported, current.current.onPendingChange);
    },
    insertPhoto(id) {
      editor?.chain().focus().insertContent({ type: "blogImage", attrs: { kind: "photo", ref: id, alt: "", caption: "" } }).run();
    },
  }), [editor]);

  return <div className="blog-editor">
    <fieldset className="blog-editor__tools" disabled={!editor || disabled}>
      <button type="button" onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()}>小标题</button>
      <button type="button" onClick={() => editor?.chain().focus().toggleBold().run()}>加粗</button>
      <button type="button" onClick={() => editor?.chain().focus().toggleItalic().run()}>斜体</button>
      <button type="button" onClick={() => editor?.chain().focus().toggleBulletList().run()}>列表</button>
      <button type="button" onClick={() => editor?.chain().focus().toggleOrderedList().run()}>编号</button>
      <button type="button" onClick={() => editor?.chain().focus().toggleBlockquote().run()}>引用</button>
      <button type="button" onClick={() => editor?.chain().focus().insertTable({ rows: 2, cols: 2, withHeaderRow: true }).run()}>表格</button>
      <details className="blog-editor__link">
        <summary>链接</summary>
        <label>链接地址<input ref={linkInput} value={link} onChange={event => setLink(event.target.value)} type="text" /></label>
        <button type="button" onClick={() => {
          const href = safeBlogLink(link.trim());
          if (href) {
            editor?.chain().focus().extendMarkRange("link").setLink({ href }).run();
            setLink("");
          } else {
            setNotice("请填写有效的链接地址。");
            linkInput.current?.focus();
          }
        }}>应用链接</button>
        <button type="button" onClick={() => editor?.chain().focus().extendMarkRange("link").unsetLink().run()}>移除链接</button>
      </details>
      <label className="blog-file-action">上传图片<input type="file" aria-label="上传正文图片" accept={imageTypes.join(",")} multiple
        onChange={event => {
          if (editor) insertFiles(editor, Array.from(event.target.files || []));
          event.target.value = "";
        }} /></label>
    </fieldset>
    <EditorContent editor={editor} />
    {notice && <p className="blog-admin-note" role="status">{notice}</p>}
  </div>;
}
