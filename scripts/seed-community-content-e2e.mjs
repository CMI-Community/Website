// Synthetic fixture for the isolated local emulator; never accepts a remote target.
import { resolve } from "node:path";
import { Miniflare } from "miniflare";
import { patternPng } from "./seed-lanna-e2e.mjs";

if (process.argv.length > 2 || process.env.CLOUDFLARE_ENV)
  throw new Error("Community content fixtures require the default local emulator.");

const fixture = {
  id: "synthetic-community-archive",
  imagePath: "synthetic-community-archive.png",
  width: 320,
  height: 480,
  title: "合成历史活动 · 栏目管理验证",
  publishedAt: "2026-01-01 10:00:00",
  publishedDate: "2026-01-01",
  eventTime: "原始目录仅记载月份：2026 年 1 月",
  initiator: "合成测试组织",
  summary: "仅用于本地验证历史海报元数据与系列归属，不代表真实活动。",
  articleUrl: "https://example.com/synthetic-community-archive",
  series: { name: "", issue: null },
  category: "合成测试",
};
const emulator = new Miniflare({
  modules: true,
  script: "export default { fetch() { return new Response('synthetic community content fixture'); } }",
  compatibilityDate: "2026-08-01",
  r2Buckets: { MEDIA: "cmi-community-public-assets" },
  resourcePersistencePath: resolve(".wrangler/state/v3"),
  logRequests: false,
});
try {
  const bucket = await emulator.getR2Bucket("MEDIA");
  const catalog = await bucket.get("poster-wall/v1/catalog.json");
  const current = catalog ? await catalog.json() : { posters: [] };
  const posters = Array.isArray(current) ? current : current.posters;
  if (!Array.isArray(posters)) throw new Error("Existing local poster catalog is not an array.");
  if (!posters.some(poster => poster.id === fixture.id)) {
    const next = [...posters, fixture];
    await bucket.put("poster-wall/v1/catalog.json", JSON.stringify(Array.isArray(current) ? next : { ...current, posters: next }), {
      httpMetadata: { contentType: "application/json" },
      customMetadata: { fixture: "synthetic-local-only" },
    });
  }
  await bucket.put(`poster-wall/v1/posters/${fixture.imagePath}`, patternPng(fixture.width, fixture.height, [[30, 75, 55], [224, 214, 184]]), {
    httpMetadata: { contentType: "image/png" },
    customMetadata: { fixture: "synthetic-local-only" },
  });
} finally {
  await emulator.dispose();
}
console.log("Prepared one synthetic local historical activity; existing catalog retained.");
