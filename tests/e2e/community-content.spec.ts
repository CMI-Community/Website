import { createHmac, randomUUID } from "node:crypto";
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test, expect, type BrowserContext } from "@playwright/test";
import { patternPng } from "../../scripts/seed-lanna-e2e.mjs";
import type { CommunityPhoto, CommunitySeries } from "../../app/modules/community-content/content-schema";
import type { EventRecord } from "../../app/modules/activities/event-schema";
import type { ArchiveEvent } from "../../app/modules/community-content/archive-repository.server";
import type { BlogPost } from "../../app/modules/blog/blog-schema";

const origin = "http://127.0.0.1:5173";
test.use({ actionTimeout: 15_000, navigationTimeout: 30_000 });
const sessionIds: string[] = [];
const headers = { Origin: origin };
const image = Buffer.from(patternPng(120, 1600, [[30, 75, 55], [224, 214, 184]]));
const logo = Buffer.from(patternPng(96, 96, [[30, 75, 55], [224, 214, 184]]));

async function signIn(context: BrowserContext) {
  const config = Object.fromEntries(readFileSync(".dev.vars", "utf8").split(/\r?\n/)
    .map(line => line.match(/^([A-Z_]+)=(.*)$/)).filter(Boolean)
    .map(match => [match![1], match![2].replace(/^['"]|['"]$/g, "")]));
  if (!config.BETTER_AUTH_SECRET || !config.EVENT_ADMIN_EMAIL)
    throw new Error("Synthetic local administrator configuration is missing.");
  const id = `content-e2e-${randomUUID()}`, token = randomUUID();
  sessionIds.push(id);
  const now = new Date().toISOString(), expires = new Date(Date.now() + 3600_000).toISOString();
  const quote = (value: string) => `'${value.replaceAll("'", "''")}'`;
  const directory = mkdtempSync(join(tmpdir(), "cmi-content-e2e-"));
  const file = join(directory, "session.sql");
  writeFileSync(file, `INSERT OR IGNORE INTO auth_users(id,name,email,emailVerified,createdAt,updatedAt) VALUES(${quote(id)},'Synthetic administrator',${quote(config.EVENT_ADMIN_EMAIL)},1,${quote(now)},${quote(now)}); INSERT OR IGNORE INTO user_roles(user_id,role) SELECT id,'admin' FROM auth_users WHERE email=${quote(config.EVENT_ADMIN_EMAIL)}; INSERT INTO auth_sessions(id,userId,token,expiresAt,createdAt,updatedAt) SELECT ${quote(id)},id,${quote(token)},${quote(expires)},${quote(now)},${quote(now)} FROM auth_users WHERE email=${quote(config.EVENT_ADMIN_EMAIL)}; INSERT INTO event_admin_otp_sessions(session_id,verified_at) VALUES(${quote(id)},${quote(now)});`, { mode: 0o600 });
  try {
    execFileSync("npx", ["wrangler", "d1", "execute", "DB", "--local", "--file", file, "--json"], { stdio: "pipe" });
  } catch { throw new Error("Synthetic administrator fixture did not complete."); }
  finally { rmSync(directory, { recursive: true }); }
  await context.addCookies([{ name: "better-auth.session_token", value: encodeURIComponent(`${token}.${createHmac("sha256", config.BETTER_AUTH_SECRET).update(token).digest("base64")}`), url: origin, httpOnly: true, sameSite: "Lax" }]);
}

test.afterAll(() => {
  if (sessionIds.length) execFileSync("npx", ["wrangler", "d1", "execute", "DB", "--local", "--command", `DELETE FROM auth_sessions WHERE id IN (${sessionIds.map(id => `'${id}'`).join(",")})`, "--json"], { stdio: "pipe" });
});

test("photo and series administration requires the existing administrator login", async ({ page }) => {
  for (const path of ["/admin/photos", "/admin/series", "/admin/archive-events/synthetic-community-archive"]) {
    await page.goto(path);
    await expect(page).toHaveURL(/\/admin\/login$/);
    await expect(page.getByRole("heading", { name: "管理员登录" })).toBeVisible();
  }
});

test("administrator publishes a series and related photos, browses the gallery and manages historical activities", async ({ page, context, browser, request }) => {
  test.setTimeout(180_000);
  await signIn(context);
  const suffix = randomUUID().slice(0, 8);
  const name = `合成系列 ${suffix}`, slug = `synthetic-series-${suffix}`;
  const caption = `合成现场照片 ${suffix}`;
  let series: CommunitySeries | undefined;
  let photo: CommunityPhoto | undefined;
  let secondPhoto: CommunityPhoto | undefined;
  let event: EventRecord | undefined;
  let originalArchive: ArchiveEvent | undefined;
  const visitor = await browser.newPage({ viewport: page.viewportSize()! });
  await visitor.route("https://assets.cmi.community/**", route => route.fulfill({ contentType: "image/png", body: logo }));
  try {
    await page.goto("/admin/series");
    await page.getByRole("button", { name: "创建栏目 ＋" }).click();
    await page.getByLabel("栏目名称 *", { exact: true }).fill(name);
    await page.getByLabel("栏目网址标识 *", { exact: true }).fill(slug);
    await page.getByLabel("栏目介绍", { exact: true }).fill("仅用于本地端到端验证的合成系列介绍。");
    const uploaded = page.waitForResponse(response => new URL(response.url()).pathname === "/api/v1/admin/media" && response.request().method() === "POST");
    await page.getByLabel("上传栏目 Logo", { exact: true }).setInputFiles({ name: "synthetic-logo.png", mimeType: "image/png", buffer: logo });
    expect((await uploaded).status()).toBe(201);
    await expect(page.getByRole("status")).toContainText("Logo 上传完成");
    await page.getByLabel("发布状态", { exact: true }).selectOption("published");
    const createdSeries = page.waitForResponse(response => new URL(response.url()).pathname === "/api/v1/admin/series" && response.request().method() === "POST");
    await page.getByRole("button", { name: "保存并发布栏目", exact: true }).click();
    series = (await (await createdSeries).json()).series;
    expect(series?.logoMediaId).toBeTruthy();
    await expect(page.getByRole("status")).toContainText("栏目已保存");
    await visitor.goto(`/series/${slug}`);
    await expect(visitor.getByRole("heading", { name, exact: true })).toBeVisible();
    expect((await request.get(series!.logoUrl!)).status()).toBe(200);

    const eventResponse = await context.request.post("/api/v1/admin/events", { headers, data: {
      title: `合成关联活动 ${suffix}`, startsAt: "2026-01-15T10:00:00+07:00", endsAt: "2026-01-15T12:00:00+07:00",
      location: "本地合成测试空间", category: "合成验证", summary: "仅用于验证照片关联与栏目索引。",
      posterMediaId: series!.logoMediaId, status: "published",
    } });
    expect(eventResponse.status()).toBe(201);
    event = (await eventResponse.json()).event;
    const membership = await context.request.patch(`/api/v1/admin/event-series/${event!.id}`, { headers: { ...headers, "If-Match": '"v0"' }, data: { seriesId: series!.id } });
    expect(membership.ok()).toBe(true);

    await page.goto("/admin/photos");
    await page.getByRole("button", { name: "上传新照片 ＋" }).click();
    const uploadedPhoto = page.waitForResponse(response => new URL(response.url()).pathname === "/api/v1/admin/media" && response.request().method() === "POST");
    await page.getByLabel("选择照片 *", { exact: true }).setInputFiles({ name: "synthetic-tall-photo.png", mimeType: "image/png", buffer: image });
    expect((await uploadedPhoto).status()).toBe(201);
    await expect(page.getByRole("status")).toContainText("照片上传完成");
    await page.getByLabel("照片说明 *", { exact: true }).fill(caption);
    await page.getByLabel("关联活动", { exact: true }).selectOption(event!.id);
    await expect(page.getByLabel("所属栏目", { exact: true })).toHaveValue(series!.id);
    await page.getByLabel("发布状态", { exact: true }).selectOption("published");
    const createdPhoto = page.waitForResponse(response => new URL(response.url()).pathname === "/api/v1/admin/photos" && response.request().method() === "POST");
    await page.getByRole("button", { name: "保存并发布照片", exact: true }).click();
    photo = (await (await createdPhoto).json()).photo;
    await expect(page.getByRole("status")).toContainText("照片已保存");
    expect((await request.get(photo!.url)).status()).toBe(200);
    const secondPhotoResponse = await context.request.post("/api/v1/admin/photos", { headers, data: {
      mediaId: series!.logoMediaId, alt: `另一张合成照片 ${suffix}`, status: "published", seriesId: series!.id, eventId: event!.id,
    } });
    expect(secondPhotoResponse.status()).toBe(201);
    secondPhoto = (await secondPhotoResponse.json()).photo;
    await page.getByLabel("查找照片", { exact: true }).fill(`no-result-${suffix}`);
    await expect(page.getByRole("heading", { name: "没有符合条件的照片" })).toBeVisible();
    await page.getByLabel("查找照片", { exact: true }).fill(caption);
    await expect(page.locator(".content-grid--photos article")).toHaveCount(1);

    await visitor.goto(`/series/${slug}`);
    await expect(visitor.getByRole("heading", { name: event!.title, exact: true })).toBeVisible();
    const trigger = visitor.getByRole("button", { name: `放大查看：${caption}`, exact: true });
    await trigger.scrollIntoViewIfNeeded(); await trigger.focus();
    const beforeScroll = await visitor.evaluate(() => window.scrollY);
    await trigger.click();
    const dialog = visitor.getByRole("dialog", { name: "栏目照片浏览" });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole("button", { name: "关闭照片 ×", exact: true })).toBeFocused();
    await expect(dialog.locator("img")).toBeVisible();
    const bounds = await dialog.locator("img").boundingBox();
    expect(bounds!.x).toBeGreaterThanOrEqual(0); expect(bounds!.y).toBeGreaterThanOrEqual(0);
    expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(visitor.viewportSize()!.width);
    expect(bounds!.y + bounds!.height).toBeLessThanOrEqual(visitor.viewportSize()!.height);
    await visitor.keyboard.press("ArrowRight");
    await expect(dialog.locator("img")).toHaveAttribute("alt", secondPhoto!.alt);
    await visitor.keyboard.press("ArrowLeft");
    await expect(dialog.locator("img")).toHaveAttribute("alt", caption);
    await expect(visitor.locator("body")).toHaveCSS("overflow", "hidden");
    await visitor.keyboard.press("Escape");
    await expect(dialog).not.toBeVisible(); await expect(trigger).toBeFocused();
    expect(Math.abs(await visitor.evaluate(() => window.scrollY) - beforeScroll)).toBeLessThan(2);
    await expect(visitor.locator("body")).not.toHaveCSS("overflow", "hidden");
    await trigger.click(); await dialog.getByRole("button", { name: "关闭照片 ×", exact: true }).click();
    await expect(dialog).not.toBeVisible();
    await trigger.click(); await dialog.getByRole("button", { name: "关闭照片背景", exact: true }).click({ position: { x: 2, y: 2 } });
    await expect(dialog).not.toBeVisible();

    // The homepage uses a separate lightbox. A real very tall PNG must leave
    // every control in the viewport, including when the browser rotates.
    const originalViewport = visitor.viewportSize()!;
    await visitor.emulateMedia({ reducedMotion: "reduce" });
    for (const viewport of [{ width: 390, height: 844 }, { width: 1280, height: 900 }, { width: 844, height: 390 }]) {
      await visitor.setViewportSize(viewport);
      await visitor.goto(`/?photoViewport=${viewport.width}#photo-museum`, { waitUntil: "domcontentloaded" });
      const museum = visitor.locator(".photo-museum");
      await expect(museum).toHaveAttribute("data-paused", "true");
      await expect(museum).toBeInViewport({ ratio: 0.8 });
      // The reverse-flow lane starts on the duplicate set. Click the real
      // visible tile, just as a pointer user does, rather than an offscreen copy.
      const copies = visitor.locator(`.photo-museum__card[data-photo-id="${photo!.id}"]`);
      const visibleCopy = await copies.evaluateAll(elements => elements.findIndex(element => {
        const bounds = element.getBoundingClientRect();
        const x = bounds.x + bounds.width / 2, y = bounds.y + bounds.height / 2;
        return x >= 0 && x <= innerWidth && y >= 0 && y <= innerHeight;
      }));
      expect(visibleCopy).toBeGreaterThanOrEqual(0);
      const photoButton = copies.nth(visibleCopy);
      await expect(photoButton).toBeVisible();
      // Record the viewport after native pointer focus and before React opens the viewer.
      await photoButton.evaluate(button => {
        (button as HTMLElement).focus({ preventScroll: true });
        button.addEventListener("click", () => {
          (button as HTMLElement).dataset.testScrollAtOpen = String(window.scrollY);
        }, { once: true, capture: true });
      });
      const oldOverflow = await visitor.locator("body").evaluate(body => body.style.overflow);
      await photoButton.click();
      const oldScroll = Number(await photoButton.getAttribute("data-test-scroll-at-open"));
      const lightbox = visitor.locator(".photo-lightbox");
      await expect(lightbox).toBeVisible();
      await expect(lightbox.locator("figure img")).toHaveAttribute("alt", caption);
      await expect(lightbox.locator("figure img")).toHaveCSS("object-fit", "contain");
      for (const target of [lightbox, lightbox.locator("figure img"), lightbox.locator(".photo-lightbox__header button"), lightbox.locator(".photo-lightbox__controls")]) {
        const rectangle = await target.boundingBox();
        expect(rectangle).not.toBeNull();
        expect(rectangle!.x).toBeGreaterThanOrEqual(-0.5); expect(rectangle!.y).toBeGreaterThanOrEqual(-0.5);
        expect(rectangle!.x + rectangle!.width).toBeLessThanOrEqual(viewport.width + 0.5);
        expect(rectangle!.y + rectangle!.height).toBeLessThanOrEqual(viewport.height + 0.5);
      }
      await visitor.keyboard.press("ArrowRight");
      await expect(lightbox.locator("figure img")).not.toHaveAttribute("alt", caption);
      await visitor.keyboard.press("ArrowLeft");
      await expect(lightbox.locator("figure img")).toHaveAttribute("alt", caption);
      await visitor.keyboard.press("Escape");
      await expect(lightbox).toHaveCount(0); await expect(photoButton).toBeFocused();
      expect(await visitor.locator("body").evaluate(body => body.style.overflow)).toBe(oldOverflow);
      expect(Math.abs(await visitor.evaluate(() => window.scrollY) - oldScroll)).toBeLessThan(2);
      await photoButton.click(); await visitor.locator(".photo-lightbox__header button").click();
      await expect(lightbox).toHaveCount(0); await expect(photoButton).toBeFocused();
      await photoButton.click(); await visitor.locator(".photo-lightbox__backdrop").click({ position: { x: 3, y: 3 } });
      await expect(lightbox).toHaveCount(0); await expect(photoButton).toBeFocused();
      expect(await visitor.locator("body").evaluate(body => body.style.overflow)).toBe(oldOverflow);
    }
    await visitor.setViewportSize(originalViewport);

    // Hiding a series closes its page and logo without changing published photos.
    const hiddenSeriesResponse = await context.request.patch(`/api/v1/admin/series/${series!.id}`, { headers: { ...headers, "If-Match": `"v${series!.version}"` }, data: { status: "unpublished" } });
    series = (await hiddenSeriesResponse.json()).series;
    expect((await request.get(`/series/${slug}`)).status()).toBe(404);
    expect((await request.get(series!.logoUrl!)).status()).toBe(404);
    expect((await request.get(photo!.url)).status()).toBe(200);
    const visibleSeriesResponse = await context.request.patch(`/api/v1/admin/series/${series!.id}`, { headers: { ...headers, "If-Match": `"v${series!.version}"` }, data: { status: "published" } });
    series = (await visibleSeriesResponse.json()).series;

    const archiveResponse = await context.request.get("/api/v1/admin/archive-events/synthetic-community-archive");
    expect(archiveResponse.ok()).toBe(true);
    originalArchive = (await archiveResponse.json()).event;
    await page.goto("/admin/archive-events/synthetic-community-archive");
    const historyTitle = `已修订历史活动 ${suffix}`;
    await page.getByLabel("活动标题 *", { exact: true }).fill(historyTitle);
    await page.getByLabel("所属系列栏目", { exact: true }).selectOption(series!.id);
    await page.getByRole("button", { name: "保存并公开", exact: true }).click();
    await expect(page.getByRole("status")).toContainText("历史活动已保存");
    await visitor.goto(`/series/${slug}`);
    await expect(visitor.getByRole("heading", { name: historyTitle, exact: true })).toBeVisible();
    await expect(visitor.getByText(originalArchive!.eventTime, { exact: true })).toBeVisible();
    await page.getByLabel("发布状态", { exact: true }).selectOption("unpublished");
    await page.getByRole("button", { name: "保存并下架", exact: true }).click();
    await expect(page.getByRole("status")).toContainText("已下架");
    await visitor.reload();
    await expect(visitor.getByRole("heading", { name: historyTitle, exact: true })).toHaveCount(0);

    await page.goto("/admin/photos");
    await page.getByLabel("查找照片", { exact: true }).fill(caption);
    await page.getByRole("button", { name: "编辑照片", exact: true }).click();
    await page.getByLabel("照片说明 *", { exact: true }).fill(`${caption} · 已修订`);
    await page.getByLabel("发布状态", { exact: true }).selectOption("unpublished");
    await page.getByRole("button", { name: "保存并下架照片", exact: true }).click();
    await expect(page.getByRole("status")).toContainText("已下架");
    expect((await request.get(photo!.url)).status()).toBe(404);
    await visitor.reload();
    await expect(visitor.getByRole("button", { name: `放大查看：${caption}`, exact: true })).toHaveCount(0);
  } finally {
    async function hide(path: string, property: "series" | "photo" | "event") {
      const response = await context.request.get(path);
      if (!response.ok()) return;
      const item = (await response.json())[property];
      if (item.status !== "unpublished") await context.request.patch(path, { headers: { ...headers, "If-Match": `"v${item.version}"` }, data: { status: "unpublished" } });
    }
    if (photo) await hide(`/api/v1/admin/photos/${photo.id}`, "photo");
    if (secondPhoto) await hide(`/api/v1/admin/photos/${secondPhoto.id}`, "photo");
    if (event) await hide(`/api/v1/admin/events/${event.id}`, "event");
    if (series) await hide(`/api/v1/admin/series/${series.id}`, "series");
    if (originalArchive) {
      const path = "/api/v1/admin/archive-events/synthetic-community-archive";
      const current = await context.request.get(path);
      if (current.ok()) {
        const currentEvent = (await current.json()).event as ArchiveEvent;
        const { title, summary, category, initiator, seriesId, status } = originalArchive;
        await context.request.patch(path, { headers: { ...headers, "If-Match": `"v${currentEvent.version}"` }, data: { title, summary, category, initiator, seriesId, status } });
      }
    }
    await visitor.close();
  }
});

test("blog supports bylines, long rich-text paste, related content, revisions and withdrawal", async ({ page, context, browser, request }) => {
  test.setTimeout(180_000);
  await signIn(context);
  const visitor = await browser.newPage({ viewport: page.viewportSize()! });
  const suffix = randomUUID().slice(0, 8);
  const authorName = "合成博客作者 " + suffix;
  const title = "合成社区回顾——从相识到共同实践的现场记录和下一次工作坊的准备 " + suffix;
  const alt = "合成博客图库 " + suffix;
  const source = "https://mp.weixin.qq.com/s/synthetic-blog-" + suffix;
  const slug = "synthetic-blog-series-" + suffix;
  const archivePath = "/api/v1/admin/archive-events/synthetic-community-archive";
  let series: CommunitySeries | undefined;
  let event: EventRecord | undefined;
  let photo: CommunityPhoto | undefined;
  let archive: ArchiveEvent | undefined;
  let post: BlogPost | undefined;
  let newer: BlogPost | undefined;
  const originalTitle = title;
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  visitor.on("pageerror", error => errors.push(error.message));
  const putVersion = (version: number) => ({ ...headers, "If-Match": '"v' + version + '"' });

  try {
    const mediaUpload = await context.request.post("/api/v1/admin/media", {
      headers, multipart: { file: { name: "synthetic-blog-photo.png", mimeType: "image/png", buffer: logo } },
    });
    expect(mediaUpload.status()).toBe(201);
    const media = (await mediaUpload.json()).media;
    const seriesResponse = await context.request.post("/api/v1/admin/series", {
      headers, data: { slug, name: "合成博客关联系列 " + suffix, status: "published" },
    });
    expect(seriesResponse.status()).toBe(201);
    series = (await seriesResponse.json()).series;
    const eventResponse = await context.request.post("/api/v1/admin/events", { headers, data: {
      title: "合成博客关联活动 " + suffix, startsAt: "2025-01-15T10:00:00+07:00", endsAt: "2025-01-15T12:00:00+07:00",
      location: "合成活动现场", category: "合成测试", summary: "本地博客验证活动。", posterMediaId: media.id, status: "published",
    } });
    expect(eventResponse.status()).toBe(201);
    event = (await eventResponse.json()).event;
    expect((await context.request.patch("/api/v1/admin/event-series/" + event!.id, {
      headers: putVersion(0), data: { seriesId: series!.id },
    })).ok()).toBe(true);
    const photoResponse = await context.request.post("/api/v1/admin/photos", {
      headers, data: { mediaId: media.id, alt, status: "published", seriesId: series!.id, eventId: event!.id },
    });
    expect(photoResponse.status()).toBe(201);
    photo = (await photoResponse.json()).photo;
    archive = (await (await context.request.get(archivePath)).json()).event;
    expect((await context.request.patch(archivePath, {
      headers: putVersion(archive!.version), data: { seriesId: series!.id, status: "published" },
    })).ok()).toBe(true);

    await visitor.goto("/admin/blog/new");
    await expect(visitor).toHaveURL(/\/admin\/login$/);
    const denied = await request.post("/api/v1/admin/blog/authors", { headers, data: { displayName: "Unauthorized", active: true } });
    expect(denied.status()).toBe(401);
    await page.goto("/admin/blog/authors");
    await page.getByRole("form", { name: "新建作者" }).getByLabel("作者署名", { exact: true }).fill(authorName);
    await page.getByRole("button", { name: "添加作者", exact: true }).click();
    await expect(page.getByRole("status")).toHaveText("作者已添加。");
    await page.goto("/admin/blog/new");
    await page.getByLabel("文章标题").fill(title);
    await page.getByLabel("摘要（可选）").fill("用来验收长文和关联的社区回顾。");
    await page.getByLabel("发布日期").fill("2025-01-03");
    await page.getByLabel("文章作者").selectOption({ label: authorName });
    await page.getByLabel("公众号原文网址（可选）").fill(source);
    const coverFile = Buffer.from(patternPng(1920, 1080, [[23, 81, 65], [223, 206, 172]]));
    const heroFile = Buffer.from(patternPng(2560, 1440, [[38, 74, 101], [237, 218, 149]]));
    for (const [label, filename, buffer] of [
      ["列表封面", "cover.png", coverFile],
      ["文章头图", "hero.png", heroFile],
    ] as const) {
      const upload = page.waitForResponse(response => new URL(response.url()).pathname === "/api/v1/admin/blog/images" && response.request().method() === "POST");
      await page.getByLabel("上传" + label, { exact: true }).setInputFiles({ name: filename, mimeType: "image/png", buffer });
      expect((await upload).status()).toBe(201);
      await expect(page.getByRole("group", { name: label, exact: true }).locator("img")).toBeVisible();
    }

    await page.route("**/api/v1/admin/blog/wechat", route => route.fulfill({
      status: 422, json: { error: { message: "公众号页面暂时无法读取。请复制图文到编辑器。" } },
    }), { times: 1 });
    await page.getByRole("button", { name: "导入公众号链接" }).click();
    await expect(page.getByRole("alert")).toBeInViewport();
    await expect(page.getByLabel("公众号原文网址（可选）")).toHaveValue(source);

    const paragraphs = Array.from({ length: 45 }, (_, i) => "<p>合成长文第 " + (i + 1) + " 段，验证段落完整性和正文顺序。</p>").join("");
    const png = "data:image/png;base64," + logo.toString("base64");
    const html = '<h2>活动现场</h2><figure><img src="' + png + '" alt="第一张图"><figcaption>第一张图注</figcaption></figure>' +
      paragraphs + '<figure><img src="' + png + '" alt="第二张图"><figcaption>第二张图注</figcaption></figure>' +
      "<mpvoice></mpvoice><p>公众号长文最终段</p>";
    const textbox = page.getByRole("textbox", { name: "文章正文" });
    await expect(textbox).toBeEditable();
    await textbox.evaluate((element, markup) => {
      const clipboardData = new DataTransfer();
      clipboardData.setData("text/html", markup);
      element.dispatchEvent(new ClipboardEvent("paste", { clipboardData, bubbles: true, cancelable: true }));
    }, html);
    await expect(page.locator(".blog-editor").getByRole("status")).toHaveText("已粘贴图文。");
    await expect(textbox.locator("figure img")).toHaveCount(2);
    await page.locator(".blog-picker summary").filter({ hasText: "活动" }).click();
    await page.getByLabel("搜索活动").fill(suffix);
    await page.getByRole("checkbox", { name: new RegExp(event!.title) }).check();
    await expect(page.getByText("通过活动关联到 " + series!.name)).toBeVisible();
    await page.getByLabel("搜索活动").fill("synthetic-community-archive");
    await page.getByRole("checkbox", { name: /历史活动/ }).check();
    await page.locator(".blog-picker summary").filter({ hasText: "照片" }).click();
    await page.getByLabel("搜索照片").fill(alt);
    await page.getByRole("checkbox", { name: alt }).check();
    await page.getByRole("button", { name: "预览文章" }).click();
    await expect(page.getByRole("article", { name: "文章预览" }).locator("figcaption")).toHaveText(["第一张图注", "第二张图注"]);
    await expect(page.locator(".blog-admin-preview .blog-article__hero img")).toHaveAttribute("width", "2560");
    await page.getByRole("button", { name: "返回编辑" }).click();

    let saved = page.waitForResponse(response => new URL(response.url()).pathname === "/api/v1/admin/blog/posts" && response.request().method() === "POST");
    await page.getByRole("button", { name: "保存草稿" }).click();
    expect((await saved).status()).toBe(201);
    post = (await (await saved).json()).post;
    const publicPath = "/b/" + post!.shortId;
    const legacyPath = "/blog/" + encodeURIComponent(post!.slug);
    const coverPath = "/media/blog/" + post!.shortId + "/" + post!.draft.coverImageId;
    const heroPath = "/media/blog/" + post!.shortId + "/" + post!.draft.heroImageId;
    await expect(page).toHaveURL(new RegExp("/admin/blog/" + post!.id + "$"));
    for (const path of [publicPath, legacyPath, coverPath, heroPath]) {
      expect((await request.get(path, { maxRedirects: 0 })).status()).toBe(404);
    }

    const published = page.waitForResponse(response => new URL(response.url()).pathname.endsWith("/publish") && response.request().method() === "POST");
    await page.getByRole("button", { name: "发布文章", exact: true }).click();
    expect((await published).status()).toBe(200);
    post = (await (await published).json()).post;
    const redirect = await request.get(legacyPath + "?from=legacy", { maxRedirects: 0 });
    expect(redirect.status()).toBe(308);
    expect(redirect.headers().location).toBe(publicPath + "?from=legacy");
    await visitor.goto(publicPath);
    await expect(visitor.getByRole("heading", { name: title, exact: true })).toBeVisible();
    await expect(visitor.locator('link[rel="canonical"]')).toHaveAttribute("href", origin + publicPath);
    await expect(visitor.locator('meta[property="og:image"]')).toHaveAttribute("content", origin + coverPath);
    await expect(visitor.locator(".blog-article__hero img")).toHaveAttribute("src", heroPath);
    await expect(visitor.locator(".blog-article__hero img")).toHaveAttribute("width", "2560");
    await expect(visitor.getByRole("link", { name: "查看头图原图" })).toHaveAttribute("href", heroPath);
    expect(await (await request.get(coverPath)).body()).toEqual(coverFile);
    expect(await (await request.get(heroPath)).body()).toEqual(heroFile);
    await expect(visitor.locator(".blog-byline time")).toHaveText("2025-01-03");
    await expect(visitor.locator(".blog-byline")).toContainText(authorName);
    await expect(visitor.locator("figcaption")).toHaveText(["第一张图注", "第二张图注"]);
    await expect(visitor.getByText("公众号长文最终段", { exact: true })).toBeVisible();
    await expect(visitor.locator(".blog-prose__embed a")).toHaveAttribute("href", source);
    const publicImage = await visitor.locator(".blog-prose img").first().getAttribute("src");
    expect(publicImage?.startsWith("/media/blog/")).toBe(true);
    expect((await request.get(publicImage!)).status()).toBe(200);
    const legacyImage = "/media" + legacyPath + "/" + publicImage!.split("/").at(-1);
    expect((await request.get(legacyImage)).status()).toBe(200);
    await expect(visitor.getByRole("button", { name: "放大查看：" + alt })).toBeVisible();

    const newTitle = "Another synthetic review " + suffix;
    const second = await context.request.post("/api/v1/admin/blog/posts", { headers, data: {
      ...post!.draft, title: newTitle, summary: "", locale: "en", displayDate: "2026-10-03", sourceUrl: "",
      coverImageId: null, heroImageId: null,
      events: [], seriesIds: [], photoIds: [],
    } });
    expect(second.status()).toBe(201);
    newer = (await second.json()).post;
    const secondPublication = await context.request.post("/api/v1/admin/blog/posts/" + newer!.id + "/publish", { headers: putVersion(newer!.version) });
    expect(secondPublication.status()).toBe(200);
    newer = (await secondPublication.json()).post;
    await visitor.goto("/blog");
    await expect(visitor.locator(".blog-story h2")).toHaveText([newTitle, title]);
    const firstRow = visitor.getByRole("link", { name: newTitle, exact: true });
    const secondRow = visitor.getByRole("link", { name: title, exact: true });
    await expect(firstRow.locator("img")).toHaveAttribute("src", "/media/blog/" + newer!.shortId + "/" + publicImage!.split("/").at(-1));
    await expect(firstRow).toContainText("合成长文第 1 段");
    await expect(secondRow).toHaveAttribute("href", publicPath);
    await expect(secondRow.locator("img")).toHaveAttribute("src", coverPath);
    await expect(secondRow.locator(".blog-story__picture")).toHaveCSS("aspect-ratio", "16 / 9");
    await secondRow.scrollIntoViewIfNeeded();
    await visitor.evaluate(() => document.fonts.ready);
    const fullTitleIsVisible = await secondRow.locator("h2").evaluate(heading => {
      const text = document.createRange();
      text.selectNodeContents(heading);
      const bounds = text.getBoundingClientRect();
      const card = heading.closest(".blog-story")!.getBoundingClientRect();
      const style = getComputedStyle(heading);
      return style.getPropertyValue("-webkit-line-clamp") === "none" && style.overflowY === "visible"
        && bounds.top >= card.top && bounds.bottom <= card.bottom
        && bounds.left >= card.left && bounds.right <= card.right;
    });
    expect(fullTitleIsVisible).toBe(true);
    const [firstRect, secondRect] = await Promise.all([firstRow.boundingBox(), secondRow.boundingBox()]);
    expect(secondRect!.width).toBeCloseTo(firstRect!.width);
    expect(secondRect!.y).toBeGreaterThanOrEqual(firstRect!.y + firstRect!.height);
    const deactivated = await context.request.put("/api/v1/admin/blog/authors/" + post!.draft.authorId, {
      headers: putVersion(1), data: { displayName: authorName, active: false },
    });
    expect(deactivated.status()).toBe(200);
    await visitor.goto(publicPath);
    await expect(visitor.locator(".blog-byline")).toContainText(authorName);

    const translationPath = "**/api/v1/blog/*/translation";
    await visitor.route(translationPath, route => route.fulfill({
      status: 503, json: { error: { message: "全文翻译暂不可用。" } },
    }), { times: 1 });
    await visitor.getByRole("button", { name: "English" }).click();
    await expect(visitor.getByRole("alert")).toContainText("全文翻译暂不可用");
    await expect(visitor.getByRole("heading", { name: originalTitle, exact: true })).toBeVisible();
    let translationRequests = 0;
    await visitor.route(translationPath, route => {
      translationRequests++;
      return translationRequests === 1 ? route.fulfill({ status: 202, json: { done: 0, total: 1 } }) : route.fulfill({
        status: 200, json: { locale: "en", revisionId: post!.revisionId, title: "Synthetic English recap", summary: "", body: post!.draft.body },
      });
    });
    await visitor.getByRole("button", { name: "English" }).click();
    await expect(visitor.getByRole("heading", { name: "Synthetic English recap" })).toBeVisible();
    await expect(visitor.locator(".blog-article__hero img")).toHaveAttribute("src", heroPath);
    await visitor.getByRole("button", { name: "View original" }).click();
    await expect(visitor.getByRole("heading", { name: title, exact: true })).toBeVisible();

    await visitor.goto("/series/" + slug);
    await expect(visitor.locator("#series-blog").getByRole("link", { name: title, exact: true })).toHaveCount(1);
    await expect(visitor.locator("#series-events").getByRole("link", { name: title, exact: true })).toHaveCount(1);
    await visitor.goto("/events/" + event!.id);
    await expect(visitor.getByRole("link", { name: title, exact: true })).toBeVisible();

    await page.getByLabel("文章标题").fill(title + " · 待更新");
    await page.getByRole("button", { name: "使用列表封面" }).click();
    saved = page.waitForResponse(response => new URL(response.url()).pathname === "/api/v1/admin/blog/posts/" + post!.id && response.request().method() === "PUT");
    await page.getByRole("button", { name: "保存草稿" }).click();
    expect((await saved).status()).toBe(200);
    post = (await (await saved).json()).post;
    await visitor.goto(publicPath);
    await expect(visitor.getByRole("heading", { name: title, exact: true })).toBeVisible();
    await expect(visitor.locator(".blog-article__hero img")).toHaveAttribute("src", heroPath);

    expect((await context.request.patch("/api/v1/admin/photos/" + photo!.id, {
      headers: putVersion(photo!.version), data: { status: "unpublished" },
    })).ok()).toBe(true);
    await visitor.reload();
    await expect(visitor.getByRole("button", { name: "放大查看：" + alt })).toHaveCount(0);
    const updated = page.waitForResponse(response => response.url().endsWith("/publish") && response.request().method() === "POST");
    await page.getByRole("button", { name: "更新公开版本" }).click();
    expect((await updated).status()).toBe(200);
    post = (await (await updated).json()).post;
    expect("/b/" + post!.shortId).toBe(publicPath);
    await visitor.goto(legacyPath);
    await expect(visitor).toHaveURL(origin + publicPath);
    await expect(visitor.getByRole("heading", { name: title + " · 待更新", exact: true })).toBeVisible();
    await expect(visitor.locator(".blog-article__hero img")).toHaveAttribute("src", coverPath);
    expect((await request.get(heroPath)).status()).toBe(404);
    await page.getByRole("button", { name: "下架", exact: true }).click();
    const withdrawn = page.waitForResponse(response => response.url().endsWith("/unpublish") && response.request().method() === "POST");
    await page.getByRole("button", { name: "确认下架", exact: true }).click();
    expect((await withdrawn).status()).toBe(200);
    post = (await (await withdrawn).json()).post;
    expect((await request.get(publicPath)).status()).toBe(404);
    expect((await request.get(legacyPath, { maxRedirects: 0 })).status()).toBe(404);
    expect((await request.get(coverPath)).status()).toBe(404);
    expect((await request.get(publicImage!)).status()).toBe(404);
    await visitor.goto("/series/" + slug);
    await expect(visitor.locator("#series-blog").getByRole("link", { name: title, exact: true })).toHaveCount(0);
    expect(errors).toEqual([]);
  } finally {
    if (post?.revisionId) await context.request.post("/api/v1/admin/blog/posts/" + post.id + "/unpublish", { headers: putVersion(post.version) });
    if (newer?.revisionId) await context.request.post("/api/v1/admin/blog/posts/" + newer.id + "/unpublish", { headers: putVersion(newer.version) });
    async function hide(path: string, property: "series" | "photo" | "event") {
      const response = await context.request.get(path);
      if (!response.ok()) return;
      const item = (await response.json())[property];
      if (item.status !== "unpublished") await context.request.patch(path, { headers: putVersion(item.version), data: { status: "unpublished" } });
    }
    if (photo) await hide("/api/v1/admin/photos/" + photo.id, "photo");
    if (event) await hide("/api/v1/admin/events/" + event.id, "event");
    if (series) await hide("/api/v1/admin/series/" + series.id, "series");
    if (archive) {
      const current = (await (await context.request.get(archivePath)).json()).event as ArchiveEvent;
      const { title, summary, category, initiator, seriesId, status } = archive;
      await context.request.patch(archivePath, { headers: putVersion(current.version), data: { title, summary, category, initiator, seriesId, status } });
    }
    await visitor.close();
  }
});
