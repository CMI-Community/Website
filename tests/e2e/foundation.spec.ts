import { expect, test } from "@playwright/test";

test("root preserves the poster-wall entry point", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveURL(/\/archive\/posters$/);
  await expect(page.getByRole("heading", { name: "海报档案正在连接" })).toBeVisible();
  await expect(page.getByText("公共资产暂时不可用")).toBeVisible();
});

test("foundation health and unauthenticated state are explicit", async ({ request }) => {
  const health = await request.get("/api/v1/health");
  expect(health.ok()).toBeTruthy();
  await expect(health.json()).resolves.toMatchObject({ ok: true, environment: "development" });

  const me = await request.get("/api/v1/me");
  expect(me.status()).toBe(401);
  await expect(me.json()).resolves.toMatchObject({
    error: { code: "AUTH_REQUIRED" },
  });
});

test("page fits the active viewport", async ({ page }) => {
  await page.goto("/archive/posters");
  const dimensions = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
  }));
  expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.clientWidth + 1);
});
