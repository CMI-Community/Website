import { afterAll, afterEach, beforeAll, describe, expect, test, vi } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { Miniflare } from "miniflare";
import { importBlogClipboard, parseWeChatPage } from "../app/modules/blog/blog-html";
import { bangkokDate, normalizeWeChatUrl } from "../app/modules/blog/blog-schema";
import { getBlogPost, getPublicBlogRevision, getPublicBlogShortId } from "../app/modules/blog/blog-repository.server";
import { completeTranslationChunk, prepareBlogTranslation, type BlogTextSegment } from "../app/modules/blog/blog-translation";
import { getBlogTranslation } from "../workers/blog-translation";
import { importWeChatBlog } from "../workers/blog-wechat";

const wechat = "https://mp.weixin.qq.com/s/synthetic-blog-fixture";
const original = {
  title: "第一次聚会",
  summary: "完整图文。",
  body: importBlogClipboard("<h2>见面</h2><p>大家 <strong>一起</strong> <a href='https://example.com'>做事</a>。</p><figure><img src='missing.jpg' alt='合影'><figcaption>活动合影</figcaption></figure>").body,
};

describe("Blog document", () => {
  test("preserves rich text, image positions and captions, native media links, and table cells", () => {
    const html = `<h2>回顾</h2><p>开始 <strong>交流</strong></p>
      <figure><img data-src="//mmbiz.qpic.cn/synthetic/0" alt="第一张"><figcaption>图注一</figcaption></figure>
      <blockquote><p>分享</p></blockquote><mpvoice></mpvoice>
      <figure><img src="data:image/png;base64,AA" alt="第二张"><figcaption>图注二</figcaption></figure>
      <table><tr><th>时间</th><td>下午</td></tr></table><p><a href="https://example.com">末段</a></p>`;
    const result = importBlogClipboard(html, wechat);
    expect(result.body.content.map(node => node.type)).toEqual(["heading", "paragraph", "blogImage", "blockquote", "blogEmbed", "blogImage", "table", "paragraph"]);
    expect(result.body.content[2].attrs).toMatchObject({ kind: "pending", ref: result.images[0].token, caption: "图注一", alt: "第一张" });
    expect(result.images[0].source).toBe("https://mmbiz.qpic.cn/synthetic/0");
    expect(result.body.content[4].attrs).toEqual({ label: "音频", href: wechat });
    expect(result.body.content[6].content?.[0].content?.map(cell => cell.type)).toEqual(["tableHeader", "tableCell"]);
    expect(result.body.content.at(-1)?.content?.[0].marks).toEqual([{ type: "link", attrs: { href: "https://example.com" } }]);
  });

  test("keeps long imported text through the last section and discards active markup", () => {
    const sections = Array.from({ length: 180 }, (_, index) => "<p>社区活动合成段落 " + index + "。</p>").join("");
    const html = `<meta property="og:title" content="社区回顾"><div id="publish_time">2026-10-03 18:53</div>
      <div id="js_content">${sections}<script>internalText</script><a href="javascript:void(0)">外部文本</a></div>`;
    const result = parseWeChatPage(html, wechat)!;
    expect(result.displayDate).toBe("2026-10-03");
    expect(result.title).toBe("社区回顾");
    expect(result.body.content).toHaveLength(181);
    expect(JSON.stringify(result.body)).toContain("社区活动合成段落 179。");
    expect(JSON.stringify(result.body)).not.toMatch(/internalText|javascript:/);
    expect(parseWeChatPage("<title>环境异常</title><h1>验证页面</h1>", wechat)).toBeNull();
    expect(normalizeWeChatUrl(wechat + "?scene=21#text")).toBe(wechat);
    expect(normalizeWeChatUrl("https://mp.weixin.qq.com.example.com/s/synthetic")).toBeNull();
    expect(bangkokDate(new Date("2026-10-03T18:10:00Z"))).toBe("2026-10-04");
  });

  test("translates all prose segments and captions without touching media, links or their markers", () => {
    const prepared = prepareBlogTranslation(original, "en");
    const results = prepared.chunks.map(chunk => chunk.map(segment => ({ id: segment.id, text: "[" + segment.text + "]" })));
    const translated = prepared.apply(results);
    expect(translated).toMatchObject({ title: "[第一次聚会]", summary: "[完整图文。]" });
    expect(translated.body.content[2].attrs).toEqual({ ...original.body.content[2].attrs, alt: "[合影]", caption: "[活动合影]" });
    expect(JSON.stringify(translated.body)).toContain('"href":"https://example.com"');
    expect(completeTranslationChunk(prepared.chunks[0], results[0].slice(1))).toBeNull();
    expect(completeTranslationChunk(prepared.chunks[0], results[0])).toEqual(results[0]);
    expect(original.body.content[2].attrs?.caption).toBe("活动合影");
  });

  test("restores English word spacing at preserved links, emphasis, inline code and long segment boundaries", () => {
    const body = importBlogClipboard(
      "<p>打开<a href='/series'>系列目录</a>，再继续。</p>" +
      "<p>最后核对。<strong>WORKSHOP-042</strong>记录了<code>CMI-18</code>张卡片。</p>" +
      "<p>补充<em> 词语</em>，保留1.<em>5</em>及未改写的re<em>use</em>。</p>" +
      "<p>" + "这".repeat(1799) + "。下一句。</p>",
    ).body;
    const plan = prepareBlogTranslation({ ...original, body }, "en");
    const translatedText = [
      "open", "the series directory", ", then continue.",
      "Final check.", "WORKSHOP-042", "records", "cards.",
      "Extra", "word", ", keeping 1.", "5", " and re", "use", " as written.",
      "Start here.", "Continue here.",
    ];
    const output = plan.apply(plan.chunks.map(chunk => chunk.map(segment => ({
      id: segment.id,
      text: Number(segment.id) < 2 ? segment.text : translatedText[Number(segment.id) - 2],
    }))));
    const contents = output.body.content.map(node => node.content?.map(item => item.text).join(""));
    expect(contents).toEqual([
      "open the series directory, then continue.",
      "Final check. WORKSHOP-042 records CMI-18 cards.",
      "Extra word, keeping 1.5 and reuse as written.",
      "Start here. Continue here.",
    ]);
    expect(output.body.content[1].content?.find(item => item.marks?.[0].type === "code")).toMatchObject({ text: "CMI-18" });
  });
});

describe("Blog Worker with isolated D1", () => {
  const postId = crypto.randomUUID();
  const first = crypto.randomUUID();
  const second = crypto.randomUUID();
  const slug = "community-recap";
  let emulator: Miniflare;
  let env: CloudflareEnv;
  let db: D1Database;
  const now = "2026-11-21T00:00:00.000Z";
  const request = new Request("http://localhost/api/v1/blog/community-recap/translation");

  beforeAll(async () => {
    emulator = new Miniflare({
      modules: true, script: "export default {fetch(){return new Response('ok')}}",
      compatibilityDate: "2026-08-01", d1Databases: ["DB"],
    });
    db = await emulator.getD1Database("DB") as unknown as D1Database;
    async function applyMigration(file: string) {
      const statements = readFileSync("migrations/" + file, "utf8").replace(/^--.*$/gm, "").split(/;\s*(?:\n|$)/);
      await db.batch(statements.filter(sql => sql.trim()).map(sql => db.prepare(sql)));
    }
    const files = readdirSync("migrations").filter(name => name.endsWith(".sql")).sort();
    const upgrade = files.indexOf("0008_add_blog_presentation_and_links.sql");
    for (const file of files.slice(0, upgrade)) await applyMigration(file);
    env = { DB: db, APP_ENV: "staging", BLOG_OPENAI_API_KEY: "synthetic-test-key" } as CloudflareEnv;
    await db.batch([
      db.prepare("INSERT INTO blog_authors(id,display_name,updated_at) VALUES('author','合成作者',?)").bind(now),
      db.prepare("INSERT INTO blog_posts(id,slug,draft_json,created_at,updated_at) VALUES(?,?,?, ?,?)").bind(postId, slug, "{}", now, now),
      ...[first, second].map((id, i) => db.prepare(`INSERT INTO blog_revisions(id,post_id,title,summary,body_json,locale,display_date,author_id,published_at)
        VALUES(?,?,?,?,?,?,'2026-10-03','author',?)`).bind(id, postId, i ? "Revised title" : original.title, original.summary, JSON.stringify(original.body), i ? "en" : "zh-CN", now)),
      db.prepare("UPDATE blog_posts SET published_revision_id=? WHERE id=?").bind(first, postId),
    ]);
    for (const file of files.slice(upgrade)) await applyMigration(file);
  }, 30_000);

  afterEach(() => vi.unstubAllGlobals());
  afterAll(async () => { await emulator?.dispose(); });

  test("preserves a published article and its old draft when assigning a short link during migration", async () => {
    const post = await getBlogPost(db, postId);
    expect(post).toMatchObject({ shortId: 1, slug, draft: { coverImageId: null, heroImageId: null } });
    expect(await getPublicBlogShortId(db, slug)).toBe(1);
    expect(await getPublicBlogRevision(db, 1)).toMatchObject({ shortId: 1, revisionId: first, title: original.title });
  });

  test("recovers from provider failure, coalesces concurrent requests, and does not serve stale or withdrawn revisions", async () => {
    const realFetch = globalThis.fetch;
    let providerCalls = 0;
    let finishProvider!: () => void;
    let startProvider!: () => void;
    const started = new Promise<void>(resolve => { startProvider = resolve; });
    const release = new Promise<void>(resolve => { finishProvider = resolve; });
    vi.stubGlobal("fetch", async (input: RequestInfo | URL, options?: RequestInit) => {
      if (input.toString() !== "https://api.openai.com/v1/responses") return realFetch(input, options);
      providerCalls++;
      if (providerCalls === 1) return new Response("unavailable", { status: 503 });
      startProvider();
      await release;
      const payload = JSON.parse(String(options?.body)) as { store: boolean; input: string };
      expect(payload.store).toBe(false);
      const inputText = JSON.parse(payload.input) as { segments: BlogTextSegment[] };
      const output = { segments: inputText.segments.map(segment => ({ ...segment, text: "✓" + segment.text })) };
      return Response.json({ status: "completed", output: [{ content: [{ type: "output_text", text: JSON.stringify(output) }] }] });
    });

    await expect(getBlogTranslation(request, env, slug, first, "en")).rejects.toMatchObject({ code: "BLOG_TRANSLATION_FAILED" });
    await db.prepare("UPDATE blog_translation_chunks SET lease_until=0 WHERE revision_id=?").bind(first).run();
    const generation = getBlogTranslation(request, env, slug, first, "en");
    try {
      await started;
      expect((await getBlogTranslation(request, env, slug, first, "en")).status).toBe(202);
    } finally {
      finishProvider();
    }
    expect(await (await generation).json()).toMatchObject({ locale: "en", title: "✓第一次聚会" });
    expect((await getBlogTranslation(request, env, slug, first, "en")).status).toBe(200);
    expect(providerCalls).toBe(2);
    await db.prepare("UPDATE blog_posts SET published_revision_id=? WHERE id=?").bind(second, postId).run();
    await expect(getBlogTranslation(request, env, slug, first, "en")).rejects.toMatchObject({ code: "BLOG_UPDATED" });
    expect(await (await getBlogTranslation(request, env, slug, second, "zh-CN")).json()).toMatchObject({ locale: "zh-CN", title: "✓Revised title" });
    await db.prepare("UPDATE blog_posts SET published_revision_id=NULL WHERE id=?").bind(postId).run();
    await expect(getBlogTranslation(request, env, slug, second, "zh-CN")).rejects.toMatchObject({ status: 404 });
    expect(await getPublicBlogRevision(db, slug)).toBeNull();
  });

  test("keeps article link import closed in production and reports a verification page in staging", async () => {
    const realFetch = globalThis.fetch;
    const fetcher = vi.fn(async (input: RequestInfo | URL, options?: RequestInit) => {
      if (input.toString() !== wechat) return realFetch(input, options);
      return new Response("<title>环境异常</title>", { headers: { "Content-Type": "text/html" } });
    });
    vi.stubGlobal("fetch", fetcher);
    await expect(importWeChatBlog({ ...env, APP_ENV: "production" }, wechat)).rejects.toMatchObject({ code: "BLOG_IMPORT_DISABLED" });
    expect(fetcher).not.toHaveBeenCalled();
    await expect(importWeChatBlog(env, wechat)).rejects.toMatchObject({ code: "BLOG_WECHAT_UNREADABLE" });
    expect(fetcher).toHaveBeenCalledWith(wechat, expect.objectContaining({ redirect: "error" }));
  });
});
