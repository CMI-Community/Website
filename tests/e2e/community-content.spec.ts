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
    for (const viewport of [{ width: 390, height: 844 }, { width: 1280, height: 900 }, { width: 844, height: 390 }]) {
      await visitor.setViewportSize(viewport);
      await visitor.goto("/", { waitUntil: "domcontentloaded" });
      await visitor.locator("#photo-museum").scrollIntoViewIfNeeded();
      const pause = visitor.getByRole("button", { name: "暂停流动", exact: true });
      if (await pause.count()) await pause.click();
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
      await photoButton.focus();
      // Pointer input may scroll a partly visible tile before opening it. Measure
      // at pointerdown so the assertion checks restoration from the real trigger.
      await photoButton.evaluate(button => button.addEventListener("pointerdown", () => {
        (button as HTMLElement).dataset.testScrollAtOpen = String(window.scrollY);
      }, { once: true }));
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
