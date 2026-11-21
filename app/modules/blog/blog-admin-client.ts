import { adminApi } from "../activities/admin-client";
import { blogImageMaxBytes } from "./blog-document";
import type { BlogImage } from "./blog-schema";

export const blogAdminApi = "/api/v1/admin/blog";
export const blogVersion = (version: number) => ({ "If-Match": '"v' + version + '"' });

export async function uploadEditorImage(file: File) {
  if (file.size > blogImageMaxBytes) throw new Error("图片大小须在 10 MB 以内。");
  const body = new FormData();
  body.set("file", file);
  return (await adminApi<{ image: BlogImage }>(blogAdminApi + "/images", { method: "POST", body })).image;
}

export async function uploadImportedImage(source: string) {
  if (/^data:image\/(?:jpeg|png|webp|gif);base64,/i.test(source)) {
    if (source.length > Math.ceil(blogImageMaxBytes * 4 / 3) + 128) throw new Error("图片大小须在 10 MB 以内。");
    const blob = await (await fetch(source)).blob();
    return uploadEditorImage(new File([blob], "clipboard-image", { type: blob.type }));
  }
  if (source.startsWith("https://")) {
    return (await adminApi<{ image: BlogImage }>(blogAdminApi + "/images/wechat", {
      method: "POST", body: JSON.stringify({ url: source }),
    })).image;
  }
  throw new Error("请手动补传图片。");
}
