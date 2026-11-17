import { beforeEach, describe, expect, it, vi } from "vitest";
import { listArchiveEvents } from "../app/modules/community-content/archive-repository.server";
import { publicPosterColorImage } from "../workers/poster-media";
vi.mock("../app/modules/community-content/archive-repository.server", () => ({ listArchiveEvents: vi.fn() }));
const catalog = vi.mocked(listArchiveEvents);
const get = vi.fn();
const env = { DB: {}, MEDIA: { get } } as unknown as Pick<CloudflareEnv, "DB" | "MEDIA">;

beforeEach(() => { vi.resetAllMocks(); });
describe("public poster analysis image route", () => {
  it("uses the current published-only projection and streams only a whitelisted R2 image", async () => {
    catalog.mockResolvedValue([{ id: "public.jpg", imagePath: "public.webp" }] as Awaited<ReturnType<typeof listArchiveEvents>>);
    get.mockResolvedValue({ body: new Uint8Array([1, 2]), httpMetadata: { contentType: "image/webp" } });
    const response = await publicPosterColorImage(new Request("https://cmi.community/media/poster-colors/public.jpg"), env);
    expect(response?.status).toBe(200);
    expect(catalog).toHaveBeenCalledWith(env, true);
    expect(get).toHaveBeenCalledWith("poster-wall/v1/posters/public.webp");
    expect(response?.headers.get("cache-control")).toBe("no-store");
    expect(response?.headers.has("access-control-allow-origin")).toBe(false);
  });
  it("rejects unpublished or missing ids, traversal and external image URLs", async () => {
    catalog.mockResolvedValue([]);
    expect((await publicPosterColorImage(new Request("https://cmi.community/media/poster-colors/hidden.jpg"), env))?.status).toBe(404);
    expect((await publicPosterColorImage(new Request("https://cmi.community/media/poster-colors/a%2Fprivate.webp"), env))?.status).toBe(404);
    catalog.mockResolvedValue([{ id: "external.jpg", imagePath: "https://example.com/private.webp" }] as Awaited<ReturnType<typeof listArchiveEvents>>);
    expect((await publicPosterColorImage(new Request("https://cmi.community/media/poster-colors/external.jpg"), env))?.status).toBe(404);
    expect(get).not.toHaveBeenCalled();
    expect((await publicPosterColorImage(new Request("https://cmi.community/media/poster-colors/public.jpg", { method: "POST" }), env))?.status).toBe(405);
  });
});
