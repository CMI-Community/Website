import { readFileSync } from "node:fs";
import { expect, test } from "@playwright/test";

const PROJECT_PATH = "/project/waytoagi/26-lanna-museum";
const ENGLISH_PATH = "/en/project/waytoagi/26-lanna-museum";
const THAI_PATH = "/th/project/waytoagi/26-lanna-museum";
const THAI_RECAP_PATH = `${THAI_PATH}/recap`;

interface LannaTestOptions {
  expectedArchiveCount?: number;
}

async function expectNoHorizontalOverflow(page: import("@playwright/test").Page) {
  const dimensions = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
  }));
  expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.clientWidth + 1);
}

export function defineLannaProjectTests(options: LannaTestOptions = {}) {
  test("Lanna project routes normalize permanently and publish complete metadata", async ({ page, request }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop-chromium", "one metadata and redirect run is sufficient");

    for (const route of [PROJECT_PATH, ENGLISH_PATH, THAI_PATH, `${PROJECT_PATH}/recap`]) {
      const response = await request.get(route, { maxRedirects: 0 });
      expect(response.status(), route).toBe(200);
    }

    const caseRedirect = await request.get("/project/WayToAGI/26-Lanna-Museum/", {
      maxRedirects: 0,
    });
    expect(caseRedirect.status()).toBe(308);
    expect(caseRedirect.headers().location).toBe(PROJECT_PATH);

    const legacyLanguage = await request.get(`${PROJECT_PATH}?lang=en`, { maxRedirects: 0 });
    expect(legacyLanguage.status()).toBe(308);
    expect(legacyLanguage.headers().location).toBe(ENGLISH_PATH);

    const missing = await request.get("/project/waytoagi/99-missing", { maxRedirects: 0 });
    expect(missing.status()).toBe(404);

    await page.goto(PROJECT_PATH);
    await expect(page).toHaveTitle("博物馆奇妙日｜CMI Community");
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
      "href",
      `https://cmi.community${PROJECT_PATH}`,
    );
    await expect(page.locator('link[rel="alternate"][hreflang="en"]')).toHaveAttribute(
      "href",
      `https://cmi.community${ENGLISH_PATH}`,
    );
    await expect(page.locator('link[rel="alternate"][hreflang="th"]')).toHaveAttribute(
      "href",
      `https://cmi.community${THAI_PATH}`,
    );
    await expect(page.locator('link[rel="alternate"][hreflang="x-default"]')).toHaveAttribute(
      "href",
      `https://cmi.community${PROJECT_PATH}`,
    );
    await expect(page.locator('meta[property="og:url"]')).toHaveAttribute(
      "content",
      `https://cmi.community${PROJECT_PATH}`,
    );
    const event = JSON.parse(
      (await page.locator('script[type="application/ld+json"]').textContent()) ?? "{}",
    );
    expect(event).toMatchObject({
      "@type": "Event",
      eventStatus: "https://schema.org/EventCompleted",
      inLanguage: "zh-CN",
      url: `https://cmi.community${PROJECT_PATH}`,
    });
  });

  test("Lanna project is a three-language read-only archive with an internal recap", async ({ page }) => {
    test.setTimeout(60_000);
    await page.emulateMedia({ reducedMotion: "reduce" });
    const requestedURLs: string[] = [];
    page.on("request", (request) => requestedURLs.push(request.url()));

    await page.goto(`${PROJECT_PATH}#archive`);
    await expect(page.locator('.lanna-project[data-language="zh"]')).toBeVisible();
    await expect(page.locator("html")).toHaveAttribute("lang", "zh-CN");
    await expect(page.locator("html")).toHaveAttribute("data-language", "zh");
    await expect(page.locator("#archive")).toBeInViewport();
    await expect(page.getByText("第 26 期已结束，纹样档案继续开放")).toBeAttached();
    await expect(page.locator(".ended-button").first()).toBeDisabled();
    await expect(page.locator('input[type="file"]')).toHaveCount(0);
    await expect(page.locator(".collection-form")).toHaveCount(0);

    const archiveTiles = page.locator("#archive .archive-tile");
    if (options.expectedArchiveCount === undefined) {
      expect(await archiveTiles.count()).toBeGreaterThanOrEqual(1);
    } else {
      await expect(archiveTiles).toHaveCount(options.expectedArchiveCount);
    }
    const firstArchiveImage = archiveTiles.first().locator("img");
    await expect(firstArchiveImage).toBeVisible();
    await expect.poll(
      () => firstArchiveImage.evaluate((image: HTMLImageElement) => image.naturalWidth),
    ).toBeGreaterThan(0);
    await expectNoHorizontalOverflow(page);

    await page.locator(".language-switcher__trigger").click();
    await page.locator('.language-switcher__menu [role="option"]', { hasText: "English" }).click();
    await expect(page).toHaveURL(new RegExp(`${ENGLISH_PATH}$`));
    await expect(page.locator('.lanna-project[data-language="en"]')).toBeVisible();
    await expect(page.locator("html")).toHaveAttribute("lang", "en");
    await expect(page.locator("html")).toHaveAttribute("data-language", "en");

    await page.locator(".language-switcher__trigger").click();
    await page.locator('.language-switcher__menu [role="option"]', { hasText: "ไทย" }).click();
    await expect(page).toHaveURL(new RegExp(`${THAI_PATH}$`));
    await expect(page.locator('.lanna-project[data-language="th"]')).toBeVisible();
    await expect(page.locator("html")).toHaveAttribute("lang", "th");
    await expect(page.locator("html")).toHaveAttribute("data-language", "th");

    await page.goto(THAI_RECAP_PATH);
    await expect(page.locator('.lanna-project[data-language="th"] .recap-page')).toBeVisible();
    await expect(page).toHaveTitle(/สรุปกิจกรรม/);
    await expectNoHorizontalOverflow(page);

    expect(
      requestedURLs.some((value) => {
        const hostname = new URL(value).hostname;
        return hostname.includes("supabase.co") || hostname === "lanna-museum-day-chiang-mai.vercel.app";
      }),
    ).toBe(false);
  });

  test("Lanna archive details export a 1080 by 1350 PNG and restore focus", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop-chromium", "one browser export is sufficient");
    test.setTimeout(60_000);
    await page.goto(`${PROJECT_PATH}#archive`);
    const firstTile = page.locator("#archive .archive-tile").first();
    await firstTile.click();

    const dialog = page.getByRole("dialog").filter({ has: page.locator(".pattern-detail") });
    await expect(dialog).toBeVisible();
    await expect(dialog.locator(".dialog__close")).toBeFocused();

    const downloadPromise = page.waitForEvent("download");
    await dialog.getByRole("button", { name: "下载纹样卡" }).click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/^CMI-LN-[A-Z0-9-]+-lanna-pattern-card\.png$/);
    const localPath = await download.path();
    expect(localPath).toBeTruthy();
    const png = readFileSync(localPath!);
    expect(png.subarray(0, 8).toString("hex")).toBe("89504e470d0a1a0a");
    expect(png.readUInt32BE(16)).toBe(1080);
    expect(png.readUInt32BE(20)).toBe(1350);

    await page.keyboard.press("Escape");
    await expect(dialog).toHaveCount(0);
    await expect(firstTile).toBeFocused();
  });
}
