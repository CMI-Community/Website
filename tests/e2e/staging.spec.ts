import { expect, test } from "@playwright/test";

const externalBaseURL = process.env.PLAYWRIGHT_BASE_URL ?? "https://staging.cmi.community";
const expectedEnvironment = new URL(externalBaseURL).hostname === "cmi.community" ? "production" : "staging";

test("staging serves the formal three-screen homepage", async ({ page, request }) => {
  const root = await request.get("/", { maxRedirects: 0 });
  expect(root.status()).toBe(200);

  await page.goto("/");
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole("heading", { name: "CMI Community", exact: true })).toBeVisible();
  await expect(page.getByText("一个在清迈的华人数字游民社区")).toBeVisible();
  await expect(page.locator(".home-social__item")).toHaveCount(7);
  await expect(page.locator('.home-social__item[href="https://discord.gg/BbaPPTRr9d"]')).toBeVisible();
  await expect(
    page.locator('.home-social__item[href^="https://space.bilibili.com/3706956986452842"]'),
  ).toBeVisible();
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
  await expect(primaryLanes).toHaveCount(2);
  await expect(primaryLanes.nth(0).locator(".photo-museum__card")).toHaveCount(27);
  await expect(primaryLanes.nth(1).locator(".photo-museum__card")).toHaveCount(27);
  const primaryPhotos = primaryLanes.nth(0).locator(".photo-museum__card");
  const firstImage = primaryPhotos.first().locator("img");
  await expect(firstImage).toBeVisible();
  await expect.poll(() => firstImage.evaluate((image: HTMLImageElement) => image.naturalWidth)).toBeGreaterThan(0);
  expect(await firstImage.evaluate((image) => getComputedStyle(image).objectFit)).toBe("contain");
  const thumbnailPath = await firstImage.getAttribute("src");
  expect(thumbnailPath).toMatch(/^\/media\/photo-museum\/v1\/thumbs\//);
  const thumbnailResponse = await page.request.get(thumbnailPath!);
  expect(thumbnailResponse.ok()).toBeTruthy();
  expect(thumbnailResponse.headers()["content-type"]).toContain("image/webp");
  expect(thumbnailResponse.headers()["cache-control"]).toContain("immutable");

  await primaryPhotos.first().click();
  const dialog = page.getByRole("dialog", { name: /照片 1 \/ 27/ });
  await expect(dialog).toBeVisible();
  await expect.poll(() => dialog.locator("figure img").evaluate((image: HTMLImageElement) => image.naturalWidth)).toBeGreaterThan(0);
  await page.keyboard.press("ArrowRight");
  await expect(page.getByRole("dialog", { name: /照片 2 \/ 27/ })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.locator(".photo-lightbox")).toHaveCount(0);

  await page.locator('.home-sticky-nav a[href="#event-museum"]').click();
  await expect(page.locator("#event-museum .cmi-poster-wall--homepage")).toBeInViewport();
  await expect(page.locator("#event-museum .cmi-community-dock")).toHaveCount(0);
  await expect(page.locator("#event-museum .cmi-wall-controls")).toBeAttached();
});

test("Photo Museum exposes both immutable WebP variants for all 27 records", async ({ request }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop-chromium", "one complete asset projection check is sufficient");
  test.setTimeout(120_000);

  const paths = Array.from({ length: 27 }, (_, index) => {
    const id = `cmi-photo-${String(index + 1).padStart(3, "0")}`;
    return [`/media/photo-museum/v1/thumbs/${id}.webp`, `/media/photo-museum/v1/full/${id}.webp`];
  }).flat();
  for (let offset = 0; offset < paths.length; offset += 4) {
    const batchPaths = paths.slice(offset, offset + 4);
    const responses = await Promise.all(batchPaths.map((path) => request.get(path)));
    for (const [index, response] of responses.entries()) {
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
