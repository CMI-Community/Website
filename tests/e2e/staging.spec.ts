import { expect, test } from "@playwright/test";

const externalBaseURL = process.env.PLAYWRIGHT_BASE_URL ?? "https://staging.cmi.community";
const expectedEnvironment = new URL(externalBaseURL).hostname === "cmi.community" ? "production" : "staging";

test("staging keeps the poster archive as the temporary entry point", async ({ page, request }) => {
  const root = await request.get("/", { maxRedirects: 0 });
  expect(root.status()).toBe(308);
  expect(root.headers().location).toBe("/archive/posters");

  await page.goto("/");
  await expect(page).toHaveURL(/\/archive\/posters$/);
  await expect(page.locator("main")).toBeVisible();
});

test("deployment health and unauthenticated state are explicit", async ({ request }) => {
  const health = await request.get("/api/v1/health");
  expect(health.ok()).toBeTruthy();
  await expect(health.json()).resolves.toMatchObject({ ok: true, environment: expectedEnvironment });

  const me = await request.get("/api/v1/me");
  expect(me.status()).toBe(401);
  await expect(me.json()).resolves.toMatchObject({ error: { code: "AUTH_REQUIRED" } });
});

test("Google and GitHub have clickable login entries", async ({ request }) => {
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
