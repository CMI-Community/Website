import { expect, test } from "@playwright/test";
import { defineLannaProjectTests } from "./lanna-tests";

defineLannaProjectTests({ expectedArchiveCount: 14 });

const externalBaseURL = process.env.PLAYWRIGHT_BASE_URL ?? "https://staging.cmi.community";
const expectedEnvironment = new URL(externalBaseURL).hostname === "cmi.community" ? "production" : "staging";
const WAYTOAGI_ACTIVITY_URL = "https://mp.weixin.qq.com/s/lBZWJ7kA4iqIMNnvEqxvyg";
const ACTIVITY_EXPECTATIONS = [
  {
    startsAt: Date.parse("2026-08-26T00:00:00+07:00"),
    endsAt: Date.parse("2026-08-27T00:00:00+07:00"),
    title: "CMI AI+3D 工坊 · 第一期｜首次走进清迈蒙福学校",
    detailUrl: "https://mp.weixin.qq.com/s/zkHrzX6XIyrE69EsNeI9dg",
    dateLabel: "2026.08.26 · 周三",
    posterWidth: 1024,
    posterKey: "activity-cmi-ai-3d-school-workshop-01-montfort.webp",
  },
  {
    startsAt: Date.parse("2026-08-28T16:00:00+07:00"),
    endsAt: Date.parse("2026-08-28T20:00:00+07:00"),
    title: "CMI 吃饭俱乐部 #1 · 周五《牛来》观影",
    detailUrl: "https://mp.weixin.qq.com/s/0Z1DTbX93zrAfwlCVxjzGg",
    dateLabel: "2026.08.28 · 周五",
    posterWidth: 941,
    posterKey: "activity-cmi-dinner-club-01-niulai-screening.webp",
  },
  {
    startsAt: Date.parse("2026-08-29T07:00:00+07:00"),
    endsAt: Date.parse("2026-08-29T12:00:00+07:00"),
    title: "8月29日｜ 清迈新云南市场 CMI 社区义卖 #1",
    detailUrl: "https://mp.weixin.qq.com/s/SW_BaQ3eFgWgsYBxWoftlQ",
    dateLabel: "2026.08.29 · 周六",
    posterWidth: 1024,
    posterKey: "activity-cmi-community-sale-01-new-yunnan-market.webp",
  },
  {
    startsAt: Date.parse("2026-08-30T12:30:00+07:00"),
    endsAt: Date.parse("2026-08-30T17:30:00+07:00"),
    title: "即兴戏剧 + AI 短剧共创",
    detailUrl: WAYTOAGI_ACTIVITY_URL,
    dateLabel: "2026.08.30 · 周日",
    posterWidth: 864,
    posterKey: "activity-waytoagi-27-improv-ai-shortfilm.webp",
  },
  {
    startsAt: Date.parse("2026-09-02T13:30:00+07:00"),
    endsAt: Date.parse("2026-09-03T00:00:00+07:00"),
    title: "CMI AI+3D 工坊 · 第二期｜清迈蒙福学校",
    detailUrl: "https://mp.weixin.qq.com/s/zkHrzX6XIyrE69EsNeI9dg",
    dateLabel: "2026.09.02 · 周三",
    posterWidth: 1024,
    posterKey: "activity-cmi-ai-3d-school-workshop-02-montfort.webp",
  },
  {
    startsAt: Date.parse("2026-09-06T14:00:00+07:00"),
    endsAt: Date.parse("2026-09-06T16:00:00+07:00"),
    title: "从「他们应该」到「我们可以」",
    detailUrl: "https://mp.weixin.qq.com/s/ih0j87_q_ygzUkqpFvz5bw",
    dateLabel: "2026.09.06 · 周日",
    posterWidth: 1024,
    posterKey: "activity-cmi-public-action-sharing-01-from-should-to-can.webp",
  },
] as const;

function expectedActivityTimeline(now: number) {
  const ongoing = ACTIVITY_EXPECTATIONS
    .filter((activity) => activity.startsAt <= now && activity.endsAt > now)
    .sort((left, right) => left.endsAt - right.endsAt);
  const upcoming = ACTIVITY_EXPECTATIONS
    .filter((activity) => activity.startsAt > now)
    .sort((left, right) => left.startsAt - right.startsAt)
    .slice(0, Math.max(0, 5 - ongoing.length));
  const museumReady = ACTIVITY_EXPECTATIONS
    .filter((activity) => activity.endsAt <= now)
    .sort((left, right) => right.endsAt - left.endsAt);
  const guaranteed = museumReady.filter((activity) => now - activity.endsAt < 24 * 60 * 60 * 1000);
  const guaranteedSet = new Set(guaranteed);
  const completed = [
    ...guaranteed,
    ...museumReady.filter((activity) => !guaranteedSet.has(activity)).slice(0, Math.max(0, 5 - guaranteed.length)),
  ];
  return { ongoing, upcoming, completed, museumReady };
}

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

test("staging presents future and completed activities around NOW", async ({ page }, testInfo) => {
  await page.goto("/");
  const section = page.locator(".activity-timeline");
  const expected = expectedActivityTimeline(Date.now());
  const active = [...expected.ongoing, ...expected.upcoming];
  const displayed = [...active, ...expected.completed];
  await expect(section).toBeVisible();
  await expect(section.locator('[role="separator"][aria-label="现在"]')).toContainText("NOW");
  const activeGroup = section.locator("#activity-timeline-active");
  const completedGroup = section.locator("#activity-timeline-completed");
  const activeCards = activeGroup.locator(".activity-timeline__activity");
  const completedCards = completedGroup.locator(".activity-timeline__activity");
  await expect(activeCards).toHaveCount(active.length);
  await expect(completedCards).toHaveCount(expected.completed.length);
  if (active.length) {
    await expect(activeCards.locator("h4")).toHaveText(active.map((activity) => activity.title));
  } else {
    await expect(activeGroup.getByText("暂无即将举行的活动")).toBeVisible();
  }
  if (expected.completed.length) {
    await expect(completedCards.locator("h4")).toHaveText(
      expected.completed.map((activity) => activity.title),
    );
    await expect(completedCards.locator(".activity-timeline__status")).toHaveText(
      expected.completed.map(() => "已完成"),
    );
  } else {
    await expect(completedGroup.getByText("近期还没有已完成活动")).toBeVisible();
  }
  for (const [index, activity] of active.entries()) {
    const card = activeCards.nth(index);
    const expectedStatus = expected.ongoing.includes(activity) ? "进行中" : "即将举行";
    await expect(card.locator(".activity-timeline__status")).toHaveText(expectedStatus);
    await card.scrollIntoViewIfNeeded();
    await expect.poll(() => card.locator("img").evaluate(
      (image: HTMLImageElement) => image.naturalWidth,
    )).toBe(activity.posterWidth);
    await expect(card.getByRole("link", { name: /查看活动详情/ })).toHaveAttribute(
      "href",
      activity.detailUrl,
    );
  }
  for (const activity of expected.museumReady) {
    await expect(page.locator(`[data-poster-key="${activity.posterKey}"]`).first()).toBeAttached();
  }

  const selected = displayed[0]!;
  const selectedStatus = expected.ongoing.includes(selected)
    ? "进行中"
    : expected.upcoming.includes(selected)
      ? "即将举行"
      : "已完成";
  const selectedCard = section.locator(".activity-timeline__activity").filter({
    has: page.getByRole("heading", { name: selected.title, exact: true }),
  });
  const posterButton = selectedCard.getByRole("button", {
    name: `放大海报（${selectedStatus}）：${selected.title}`,
  });
  const poster = posterButton.locator("img");
  await expect.poll(() => poster.evaluate((image: HTMLImageElement) => image.naturalWidth))
    .toBe(selected.posterWidth);
  await expect(selectedCard.getByRole("link", { name: /查看活动详情/ }))
    .toHaveAttribute("href", selected.detailUrl);

  if (testInfo.project.name === "desktop-chromium") {
    await posterButton.hover({ position: { x: 24, y: 50 } });
    await expect.poll(() => posterButton.locator(".activity-timeline__poster").evaluate(
      (element) => getComputedStyle(element).transform,
    )).not.toBe("none");
  } else {
    await section.getByRole("button", { name: /已完成 \d+/ }).click();
    await expect.poll(() => completedGroup.evaluate((group) => {
      const groupRect = group.getBoundingClientRect();
      const trackRect = group.parentElement!.getBoundingClientRect();
      return Math.min(groupRect.right, trackRect.right) - Math.max(groupRect.left, trackRect.left);
    })).toBeGreaterThan(50);
  }

  await posterButton.click();
  const dialog = page.getByRole("dialog", { name: selected.title });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByText(selectedStatus, { exact: true })).toBeVisible();
  await expect(dialog.getByText(selected.dateLabel)).toBeVisible();
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
