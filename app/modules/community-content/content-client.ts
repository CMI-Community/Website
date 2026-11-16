import { adminApi } from "../activities/admin-client";
import type { CommunityPhoto, PublicationStatus } from "./content-schema";

export const contentStatusLabels: Record<PublicationStatus, string> = {
  draft: "草稿",
  published: "已发布",
  unpublished: "已下架",
};

export async function uploadContentImage(file: File) {
  if (file.size > 10 * 1024 * 1024)
    throw new Error("图片大小必须在 10 MB 以内。");
  const body = new FormData();
  body.set("file", file);
  const result = await adminApi<{
    media: { id: string; width: number; height: number; previewUrl: string };
  }>("/api/v1/admin/media", { method: "POST", body });
  return result.media;
}

export function adminPhotoPreview(photo: CommunityPhoto, full = false): string {
  return photo.mediaId
    ? `/api/v1/admin/media/${encodeURIComponent(photo.mediaId)}`
    : `/api/v1/admin/photos/${encodeURIComponent(photo.id)}/${full ? "image" : "preview"}`;
}

export function matchesContentQuery(query: string, values: unknown[]): boolean {
  const search = query.trim().toLocaleLowerCase();
  return !search || values.filter(Boolean).join(" ").toLocaleLowerCase().includes(search);
}

export function archivePosterImage(path: string): string {
  return path.startsWith("/") || /^https:\/\//i.test(path)
    ? path
    : `https://assets.cmi.community/poster-wall/v1/posters/${path}`;
}
