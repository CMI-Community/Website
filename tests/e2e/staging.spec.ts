import { expect, test } from "@playwright/test";
import { defineLannaProjectTests } from "./lanna-tests";

defineLannaProjectTests({ expectedArchiveCount: 14 });

const externalBaseURL = process.env.PLAYWRIGHT_BASE_URL ?? "https://staging.cmi.community";
const expectedEnvironment = new URL(externalBaseURL).hostname === "cmi.community" ? "production" : "staging";
const DINNER_ACTIVITY_START = Date.parse("2026-08-28T16:00:00+07:00");
const DINNER_ACTIVITY_URL = "https://mp.weixin.qq.com/s/0Z1DTbX93zrAfwlCVxjzGg";
const WAYTOAGI_ACTIVITY_START = Date.parse("2026-08-30T12:30:00+07:00");
const WAYTOAGI_ACTIVITY_URL = "https://mp.weixin.qq.com/s/lBZWJ7kA4iqIMNnvEqxvyg";

test("staging serves the formal three-screen homepage", async ({ page, request }) => {
  const root = await request.get("/", { maxRedirects: 0 });
  expect(root.status()).toBe(200);

  await page.goto("/");
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole("heading", { name: "CMI Community", exact: true })).toBeVisible();
  await expect(page.getByText("一个在清迈的华人数字游民社区")).toBeVisible();
  await expect(page.locator(".home-social__item")).toHaveCount(7);
  const discord = page.locator('.home-social__item[href="https://discord.gg/BbaPPTRr9d"]');
  await expect(discord).toBeVisible();
  await expect(discord).not.toHaveClass(/is-featured/);
  await expect(page.locator(".home-sticky-nav__discord")).toHaveCount(0);
  await expect(
    page.locator('.home-social__item[href^="https://space.bilibili.com/3706956986452842"]'),
  ).toBeVisible();
});

test("Projects menu is available before and after the hero", async ({ page }) => {
  const homepageRequests: string[] = [];
  page.on("request", (request) => homepageRequests.push(request.url()));
  await page.goto("/");

  const heroTrigger = page.locator(".home-hero__topline .project-menu__trigger");
  await expect(heroTrigger).toBeVisible();
  await expect(page.locator(".home-sticky-nav .project-menu__trigger")).toHaveCount(0);
  await heroTrigger.click();

  const heroPanel = page.locator(".home-hero__topline .project-menu__panel");
  await expect(heroPanel).toBeVisible();
  await expect(heroPanel.getByText("01 / 一级目录 · SERIES")).toBeVisible();
  await expect(heroPanel.getByText("02 / 二级目录 · ISSUES")).toBeVisible();
  await expect(heroPanel.getByText("WaytoAGI 切磋大会 · 清迈场")).toBeVisible();
  const externalIssue = heroPanel.getByRole("link", { name: /第 27 期 · 即兴戏剧 \+ AI 短剧共创/ });
  await expect(externalIssue).toContainText("2026.08.30");
  await expect(externalIssue).toHaveAttribute("href", WAYTOAGI_ACTIVITY_URL);
  await expect(externalIssue).toHaveAttribute("target", "_blank");
  const nativeIssue = heroPanel.getByRole("link", { name: /第 26 期 · 博物馆奇妙日/ });
  await expect(nativeIssue).toContainText("2026.07.26");
  await expect(nativeIssue).toHaveAttribute("href", "/project/waytoagi/26-lanna-museum");
  await expect(nativeIssue).not.toHaveAttribute("target", "_blank");
  expect(homepageRequests.some((url) => url.includes("/lanna-museum/"))).toBe(false);
  expect(homepageRequests.some((url) => url.includes("/media/projects/waytoagi/26-lanna-museum/"))).toBe(false);

  await page.keyboard.press("Escape");
  await expect(heroPanel).toHaveCount(0);
  await expect(heroTrigger).toBeFocused();

  await page.locator('.home-museum-entries a[href="#photo-museum"]').click();
  await expect(page.locator("#photo-museum")).toBeInViewport({ timeout: 15_000 });
  await expect(page.locator('.home-sticky-nav[data-visible="true"]')).toBeVisible({
    timeout: 15_000,
  });
  const stickyTrigger = page.locator(".home-sticky-nav .project-menu__trigger");
  await stickyTrigger.click();
  const stickyPanel = page.locator(".home-sticky-nav .project-menu__panel");
  await expect(stickyPanel).toBeVisible();
  await expect(stickyPanel.getByRole("link", { name: /第 26 期 · 博物馆奇妙日/ })).toHaveAttribute(
    "href",
    "/project/waytoagi/26-lanna-museum",
  );

  const dimensions = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
  }));
  expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.clientWidth + 1);

  await stickyPanel.getByRole("link", { name: /第 26 期 · 博物馆奇妙日/ }).click();
  await expect(page).toHaveURL(/\/project\/waytoagi\/26-lanna-museum$/);
});

test("staging orders current activities nearest-first and preserves their lifecycle", async ({ page }, testInfo) => {
  await page.goto("/");
  const section = page.locator(".upcoming-activities");
  const now = Date.now();
  if (now >= WAYTOAGI_ACTIVITY_START) {
    await expect(section).toHaveCount(0);
    await expect(
      page.locator('[data-poster-key="activity-cmi-dinner-club-01-niulai-screening.webp"]'),
    ).toBeAttached();
    await expect(
      page.locator('[data-poster-key="activity-waytoagi-27-improv-ai-shortfilm.webp"]'),
    ).toBeAttached();
    return;
  }

  await expect(section).toBeVisible();
  const cards = section.locator(".upcoming-activity");
  if (now < DINNER_ACTIVITY_START) {
    await expect(cards).toHaveCount(2);
    await expect(cards.locator("h3")).toHaveText([
      "CMI 吃饭俱乐部 #1 · 周五《牛来》观影",
      "即兴戏剧 + AI 短剧共创",
    ]);
    const dinnerPoster = cards.nth(0).locator("img");
    const waytoagiPoster = cards.nth(1).locator("img");
    await expect.poll(() => dinnerPoster.evaluate((image: HTMLImageElement) => image.naturalWidth)).toBe(941);
    await expect.poll(() => waytoagiPoster.evaluate((image: HTMLImageElement) => image.naturalWidth)).toBe(864);
    await expect(cards.nth(0).getByRole("link", { name: /查看详情/ })).toHaveAttribute(
      "href",
      DINNER_ACTIVITY_URL,
    );
    await expect(cards.nth(1).getByRole("link", { name: /查看详情/ })).toHaveAttribute(
      "href",
      WAYTOAGI_ACTIVITY_URL,
    );
  } else {
    await expect(cards).toHaveCount(1);
    await expect(cards.locator("h3")).toHaveText("即兴戏剧 + AI 短剧共创");
    await expect(
      page.locator('[data-poster-key="activity-cmi-dinner-club-01-niulai-screening.webp"]'),
    ).toBeAttached();
  }

  const posterButton = now < DINNER_ACTIVITY_START
    ? section.getByRole("button", { name: /放大海报：CMI 吃饭俱乐部 #1/ })
    : section.getByRole("button", { name: /放大海报：即兴戏剧 \+ AI 短剧共创/ });
  const poster = posterButton.locator("img");
  await expect.poll(() => poster.evaluate((image: HTMLImageElement) => image.naturalWidth)).toBe(
    now < DINNER_ACTIVITY_START ? 941 : 864,
  );
  await expect(posterButton.locator("xpath=ancestor::article").getByRole("link", { name: /查看详情/ }))
    .toHaveAttribute(
      "href",
      now < DINNER_ACTIVITY_START ? DINNER_ACTIVITY_URL : WAYTOAGI_ACTIVITY_URL,
    );

  if (testInfo.project.name === "desktop-chromium") {
    await posterButton.hover({ position: { x: 24, y: 50 } });
    await expect.poll(() => posterButton.locator(".upcoming-activity__poster").evaluate(
      (element) => getComputedStyle(element).transform,
    )).not.toBe("none");
  }

  await posterButton.click();
  const dialog = now < DINNER_ACTIVITY_START
    ? page.getByRole("dialog", { name: /CMI 吃饭俱乐部 #1/ })
    : page.getByRole("dialog", { name: /即兴戏剧 \+ AI 短剧共创/ });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByText(
    now < DINNER_ACTIVITY_START ? "2026.08.28 · 周五" : "2026.08.30 · 周日",
  )).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
  await expect(posterButton).toBeFocused();
});

test("Photo Museum preserves every image and supports navigation and full-screen viewing", async ({ page }) => {
  test.setTimeout(60_000);
  await page.goto("/");
  await page.locator('.home-museum-entries a[href="#photo-museum"]').click();
  await expect(page.locator("#photo-museum")).toBeInViewport();
  await expect(page.locator('.home-sticky-nav[data-visible="true"]')).toBeVisible();
  await expect(page.locator('.home-sticky-nav a[aria-current="page"]')).toHaveAttribute(
    "href",
    "#photo-museum",
  );
  await page.getByRole("button", { name: "暂停流动" }).click();

  const primaryLanes = page.locator(
    '.photo-museum__lane .photo-museum__set:not([aria-hidden="true"])',
  );
  await expect(primaryLanes).toHaveCount(7);
  await expect(primaryLanes.locator(".photo-museum__card")).toHaveCount(528);
  const primaryPhotos = primaryLanes.locator(".photo-museum__card");
  const visiblePhotoId = await primaryPhotos.evaluateAll((cards) => {
    const card = cards.find((candidate) => {
      const rect = candidate.getBoundingClientRect();
      return rect.right > 0 && rect.left < window.innerWidth && rect.bottom > 0 && rect.top < window.innerHeight;
    });
    return card?.getAttribute("data-photo-id") ?? null;
  });
  expect(visiblePhotoId).toMatch(/^cmi-photo-\d{3}$/);
  const visiblePhoto = primaryPhotos.filter({ has: page.locator(`img[src*="${visiblePhotoId}"]`) }).first();
  const visibleImage = visiblePhoto.locator("img");
  await expect(visibleImage).toBeVisible();
  await expect.poll(() => visibleImage.evaluate((image: HTMLImageElement) => image.naturalWidth)).toBeGreaterThan(0);
  expect(await visibleImage.evaluate((image) => getComputedStyle(image).objectFit)).toBe("contain");
  const thumbnailPath = await visibleImage.getAttribute("src");
  expect(thumbnailPath).toMatch(/^\/media\/photo-museum\/v2\/thumbs\//);
  const thumbnailResponse = await page.request.get(thumbnailPath!);
  expect(thumbnailResponse.ok()).toBeTruthy();
  expect(thumbnailResponse.headers()["content-type"]).toContain("image/webp");
  expect(thumbnailResponse.headers()["cache-control"]).toContain("immutable");

  await visiblePhoto.click();
  const visiblePhotoNumber = Number(visiblePhotoId!.slice(-3));
  const dialog = page.getByRole("dialog", { name: new RegExp(`照片 ${visiblePhotoNumber} / 528`) });
  await expect(dialog).toBeVisible();
  await expect.poll(() => dialog.locator("figure img").evaluate((image: HTMLImageElement) => image.naturalWidth)).toBeGreaterThan(0);
  await page.keyboard.press("ArrowRight");
  const nextPhotoNumber = visiblePhotoNumber === 528 ? 1 : visiblePhotoNumber + 1;
  await expect(page.getByRole("dialog", { name: new RegExp(`照片 ${nextPhotoNumber} / 528`) })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.locator(".photo-lightbox")).toHaveCount(0);

  await page.locator('.home-sticky-nav a[href="#event-museum"]').click();
  await expect(page.locator("#event-museum .cmi-poster-wall--homepage")).toBeInViewport();
  await expect(page.locator("#event-museum .cmi-community-dock")).toHaveCount(0);
  await expect(page.locator("#event-museum .cmi-wall-controls")).toBeAttached();
});

test("Photo Museum exposes both immutable WebP variants for all 528 records", async ({ request }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop-chromium", "one complete asset projection check is sufficient");
  test.setTimeout(360_000);

  const paths = Array.from({ length: 528 }, (_, index) => {
    const id = `cmi-photo-${String(index + 1).padStart(3, "0")}`;
    return [`/media/photo-museum/v2/thumbs/${id}.webp`, `/media/photo-museum/v2/full/${id}.webp`];
  }).flat();
  for (let offset = 0; offset < paths.length; offset += 8) {
    const batchPaths = paths.slice(offset, offset + 8);
    const responses = await Promise.all(batchPaths.map((path) => request.head(path)));
    for (const [index, initialResponse] of responses.entries()) {
      let response = initialResponse;
      for (let attempt = 1; response.status() !== 200 && attempt < 4; attempt += 1) {
        await response.dispose();
        await new Promise((resolve) => setTimeout(resolve, attempt * 250));
        response = await request.head(batchPaths[index]);
      }
      expect(response.status(), batchPaths[index]).toBe(200);
      expect(response.headers()["content-type"], batchPaths[index]).toContain("image/webp");
      expect(response.headers()["cache-control"], batchPaths[index]).toContain("immutable");
      await response.dispose();
    }
  }
});

test("homepage has no horizontal overflow and honors reduced motion", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/#photo-museum");
  await expect(page.locator('.photo-museum[data-paused="true"]')).toBeVisible();
  const dimensions = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
  }));
  expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.clientWidth + 1);
});

test("deployment health and unauthenticated state are explicit", async ({ request }) => {
  const health = await request.get("/api/v1/health");
  expect(health.ok()).toBeTruthy();
  await expect(health.json()).resolves.toMatchObject({ ok: true, environment: expectedEnvironment });

  const me = await request.get("/api/v1/me");
  expect(me.status()).toBe(401);
  await expect(me.json()).resolves.toMatchObject({ error: { code: "AUTH_REQUIRED" } });
});

test("Google and GitHub have clickable login entries", async ({ request }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop-chromium", "one remote OAuth check is sufficient");

  for (const [provider, host] of [
    ["google", "accounts.google.com"],
    ["github", "github.com"],
  ] as const) {
    const response = await request.get(`/login/${provider}?returnTo=/archive/posters`, {
      maxRedirects: 0,
    });
    expect(response.status()).toBe(302);
    expect(new URL(response.headers().location).hostname).toBe(host);
    expect(response.headers()["set-cookie"]).toBeTruthy();
  }
});

test("the public poster projection contains 180 safe records", async ({ request }) => {
  const response = await request.get("/api/v1/posters");
  expect(response.ok()).toBeTruthy();
  const payload = await response.json();
  expect(payload.posters).toHaveLength(180);
  expect(JSON.stringify(payload)).not.toMatch(
    /localPath|sourcePath|archivePath|authorization|evidence|"status"\s*:|"hash"\s*:/,
  );
});

test("poster UI and R2 images work at the active viewport", async ({ page }) => {
  await page.goto("/archive/posters");
  const firstPoster = page.locator("img").first();
  await expect(firstPoster).toBeVisible();
  await expect.poll(() => firstPoster.evaluate((image: HTMLImageElement) => image.naturalWidth)).toBeGreaterThan(0);

  const dimensions = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
  }));
  expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.clientWidth + 1);
  await expect(page.locator('.cmi-community-dock__item[href="https://discord.gg/BbaPPTRr9d"]')).toBeAttached();
  await expect(
    page.locator('.cmi-community-dock__item[href^="https://space.bilibili.com/3706956986452842"]'),
  ).toBeAttached();
});

test("migrated feedback is visible and an uninvited signup is blocked", async ({ request }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop-chromium", "one remote integration check is sufficient");

  const feedback = await request.get("/api/feedback");
  const feedbackPayload = await feedback.json();
  expect(feedbackPayload.ideas).toHaveLength(3);
  expect(
    feedbackPayload.ideas.reduce(
      (total: number, idea: { upvotes: number; downvotes: number }) => total + idea.upvotes + idea.downvotes,
      0,
    ),
  ).toBe(2);

  const email = `uninvited-staging-${Date.now()}@example.com`;
  const blocked = await request.post("/api/auth/sign-up/email", {
    headers: { Origin: "https://staging.cmi.community" },
    data: { email, password: "Correct-Horse-123!", name: "No Invitation" },
  });
  expect(blocked.status()).toBe(403);
});
