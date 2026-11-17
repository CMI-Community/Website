import { execFileSync } from "node:child_process";
import { expect, test } from "@playwright/test";
import { defineLannaProjectTests } from "./lanna-tests";
import { patternPng } from "../../scripts/seed-lanna-e2e.mjs";

defineLannaProjectTests();

const WAYTOAGI_ACTIVITY_URL = "https://mp.weixin.qq.com/s/lBZWJ7kA4iqIMNnvEqxvyg";
const ACTIVITY_TIMELINE_TEST_NOW = Date.parse("2026-09-19T15:00:00+07:00");
const ACTIVITY_EXPECTATIONS = [
  {
    startsAt: Date.parse("2026-07-10T00:00:00+07:00"),
    endsAt: Date.parse("2026-07-11T00:00:00+07:00"),
    title: "CMI AI+3D 工坊 · 第一期｜首次走进清迈蒙福学校",
    detailUrl: "https://mp.weixin.qq.com/s/zkHrzX6XIyrE69EsNeI9dg",
    dateLabel: "2026.07.10（补录日期）",
    timeLabel: "",
    posterKey: "activity-cmi-ai-3d-school-workshop-01-montfort.webp",
  },
  {
    startsAt: Date.parse("2026-08-28T16:00:00+07:00"),
    endsAt: Date.parse("2026-08-28T20:00:00+07:00"),
    title: "CMI 吃饭俱乐部 #1 · 周五《牛来》观影",
    detailUrl: "https://mp.weixin.qq.com/s/0Z1DTbX93zrAfwlCVxjzGg",
    dateLabel: "2026.08.28 · 周五",
    timeLabel: "16:00–20:00 · 清迈时间",
    posterKey: "activity-cmi-dinner-club-01-niulai-screening.webp",
  },
  {
    startsAt: Date.parse("2026-08-29T07:00:00+07:00"),
    endsAt: Date.parse("2026-08-29T12:00:00+07:00"),
    title: "8月29日｜ 清迈新云南市场 CMI 社区义卖 #1",
    detailUrl: "https://mp.weixin.qq.com/s/SW_BaQ3eFgWgsYBxWoftlQ",
    dateLabel: "2026.08.29 · 周六",
    timeLabel: "07:00–12:00 · 清迈时间",
    posterKey: "activity-cmi-community-sale-01-new-yunnan-market.webp",
  },
  {
    startsAt: Date.parse("2026-08-30T12:30:00+07:00"),
    endsAt: Date.parse("2026-08-30T17:30:00+07:00"),
    title: "即兴戏剧 + AI 短剧共创",
    detailUrl: WAYTOAGI_ACTIVITY_URL,
    dateLabel: "2026.08.30 · 周日",
    timeLabel: "12:30–17:30 · 清迈时间",
    posterKey: "activity-waytoagi-27-improv-ai-shortfilm.webp",
  },
  {
    startsAt: Date.parse("2026-07-10T00:00:00+07:00"),
    endsAt: Date.parse("2026-07-11T00:00:00+07:00"),
    title: "CMI AI+3D 工坊 · 第二期｜清迈蒙福学校",
    detailUrl: "https://mp.weixin.qq.com/s/zkHrzX6XIyrE69EsNeI9dg",
    dateLabel: "2026.07.10（补录日期）",
    timeLabel: "",
    posterKey: "activity-cmi-ai-3d-school-workshop-02-montfort.webp",
  },
  {
    startsAt: Date.parse("2026-09-06T14:00:00+07:00"),
    endsAt: Date.parse("2026-09-06T16:00:00+07:00"),
    title: "从「他们应该」到「我们可以」",
    detailUrl: "https://mp.weixin.qq.com/s/ih0j87_q_ygzUkqpFvz5bw",
    dateLabel: "2026.09.06 · 周日",
    timeLabel: "14:00–16:00 · 清迈时间",
    posterKey: "activity-cmi-public-action-sharing-01-from-should-to-can.webp",
  },
  {
    startsAt: Date.parse("2026-09-18T15:00:00+07:00"),
    endsAt: Date.parse("2026-09-18T19:00:00+07:00"),
    title: "CMI 空想食堂｜周五·食天然俱乐部",
    detailUrl: "https://mp.weixin.qq.com/s/GK9e1FQonKd-fOIpW5m8HA",
    dateLabel: "2026.09.18 · 周五",
    timeLabel: "15:00–19:00 · 清迈时间",
    posterKey: "activity-cmi-natural-food-club-01-friday-kitchen.webp",
  },
  {
    startsAt: Date.parse("2026-09-19T14:00:00+07:00"),
    endsAt: Date.parse("2026-09-19T17:00:00+07:00"),
    title: "CMI × 清迈印象｜手工冰皮月饼中秋活动",
    detailUrl: "https://mp.weixin.qq.com/s/Vf1ZGH1Fufo6JbY6LjI3BA",
    dateLabel: "2026.09.19 · 周六",
    timeLabel: "14:00–17:00 · 清迈时间",
    posterKey: "activity-cmi-mid-autumn-gathering-01-snow-skin-mooncake.webp",
  },
  {
    startsAt: Date.parse("2026-09-26T18:00:00+07:00"),
    endsAt: Date.parse("2026-09-26T20:00:00+07:00"),
    title: "CMI TALK #13｜把清迈过成家",
    detailUrl: "https://mp.weixin.qq.com/s/ujfaDoxYS2aRseRAGsz42g",
    dateLabel: "2026.09.26 · 周六",
    timeLabel: "18:00–20:00 · 清迈时间",
    posterKey: "activity-cmi-talk-13-home-in-chiang-mai.webp",
  },
  {
    startsAt: Date.parse("2026-10-04T17:30:00+07:00"),
    endsAt: Date.parse("2026-10-04T19:30:00+07:00"),
    title: "明月照他乡｜大人观影 × 小小文化家",
    detailUrl: "https://mp.weixin.qq.com/s/0J8quLYYdAdpYBbB9UuLvw",
    dateLabel: "2026.10.04 · 周日",
    timeLabel: "17:30–19:30 · 清迈时间",
    posterKey: "activity-cmi-cultural-night-01-moon-over-a-foreign-land.webp",
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

function d1(command: string): string {
  return execFileSync(
    "npx",
    ["wrangler", "d1", "execute", "DB", "--local", "--command", command, "--json"],
    { cwd: process.cwd(), encoding: "utf8", env: { ...process.env, NO_COLOR: "1" } },
  );
}

test("root renders the formal community homepage with independent museum fallbacks", async ({ page, request }) => {
  const response = await request.get("/", { maxRedirects: 0 });
  expect(response.status()).toBe(200);
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole("heading", { name: "CMI Community", exact: true })).toBeVisible();
  await expect(page.getByText("一个在清迈的华人数字游民社区")).toBeVisible();
  await expect(page.locator(".home-social__item")).toHaveCount(7);
  const discord = page.locator('.home-social__item[href="https://discord.gg/BbaPPTRr9d"]');
  await expect(discord).toBeVisible();
  await expect(discord).not.toHaveClass(/is-featured/);
  await expect(page.locator(".home-sticky-nav__discord")).toHaveCount(0);
  if (await page.locator(".photo-museum").count()) {
    const primaryLanes = page.locator(
      '.photo-museum__lane .photo-museum__set:not([aria-hidden="true"])',
    );
    await expect(primaryLanes).toHaveCount(7);
    await expect(primaryLanes.locator(".photo-museum__card")).toHaveCount(528);
  } else {
    await expect(page.getByRole("heading", { name: "照片档案正在连接" })).toBeAttached();
  }
  if (await page.locator("#event-museum .cmi-poster-wall").count()) {
    await expect(page.locator("#event-museum .cmi-poster-wall")).toBeAttached();
  } else {
    await expect(page.getByRole("heading", { name: "海报档案正在连接" })).toBeAttached();
  }
});

test("Projects menu exposes series and issues from both navigation states", async ({ page }) => {
  test.setTimeout(60_000);
  const homepageRequests: string[] = [];
  page.on("request", (request) => homepageRequests.push(request.url()));
  await page.goto("/", { waitUntil: "domcontentloaded" });

  const heroTrigger = page.locator(".home-hero__topline .project-menu__trigger");
  await expect(heroTrigger).toBeVisible();
  await expect(heroTrigger).toHaveAccessibleName("Projects 项目系列");
  await expect(page.locator(".home-sticky-nav .project-menu__trigger")).toHaveCount(0);

  const heroPanel = page.locator(".home-hero__topline .project-menu__panel");
  await expect(async () => {
    if (!(await heroPanel.isVisible())) {
      await heroTrigger.focus();
      await page.keyboard.press("Enter");
    }
    await expect(heroPanel).toBeVisible({ timeout: 1000 });
  }).toPass({ timeout: 15_000 });
  await expect(heroPanel.getByText("01 / 一级目录 · SERIES")).toBeVisible();
  await expect(heroPanel.getByText("02 / 二级目录 · ISSUES")).toBeVisible();
  await expect(heroPanel.getByText("WaytoAGI 切磋大会 · 清迈场")).toBeVisible();
  await expect(heroPanel.getByText("WaytoAGI 发起 · CMI Community 组织清迈场")).toBeVisible();
  const externalIssue = heroPanel.getByRole("link", { name: /第 27 期 · 即兴戏剧 \+ AI 短剧共创/ });
  await expect(externalIssue).toContainText("2026.08.30");
  await expect(externalIssue).toHaveAttribute("href", WAYTOAGI_ACTIVITY_URL);
  await expect(externalIssue).toHaveAttribute("target", "_blank");
  const nativeIssue = heroPanel.getByRole("link", { name: /第 26 期 · 博物馆奇妙日/ });
  await expect(nativeIssue).toContainText("2026.07.26");
  await expect(nativeIssue).toHaveAttribute("href", "/project/waytoagi/26-lanna-museum");
  await expect(nativeIssue).not.toHaveAttribute("target", "_blank");
  await expect(nativeIssue).not.toHaveAttribute("rel", "noreferrer");
  expect(homepageRequests.some((url) => url.includes("/lanna-museum/"))).toBe(false);
  expect(homepageRequests.some((url) => url.includes("/media/projects/waytoagi/26-lanna-museum/"))).toBe(false);

  const panelBounds = await heroPanel.evaluate((panel) => {
    const rect = panel.getBoundingClientRect();
    return { left: rect.left, right: rect.right, viewportWidth: window.innerWidth };
  });
  expect(panelBounds.left).toBeGreaterThanOrEqual(0);
  expect(panelBounds.right).toBeLessThanOrEqual(panelBounds.viewportWidth + 1);

  await page.keyboard.press("Escape");
  await expect(heroPanel).toHaveCount(0);
  await expect(heroTrigger).toBeFocused();

  await heroTrigger.click();
  await externalIssue.evaluate((link) => {
    link.addEventListener("click", (event) => event.preventDefault(), { once: true });
  });
  await externalIssue.click();
  await expect(heroPanel).toHaveCount(0);
  await expect(heroTrigger).toBeFocused();

  await heroTrigger.click();
  await page.locator("body").dispatchEvent("pointerdown", {
    pointerType: "mouse",
    clientX: 2,
    clientY: 2,
  });
  await expect(heroPanel).toHaveCount(0);

  await page.locator('.home-museum-entries a[href="#photo-museum"]').click();
  await expect(page.locator('.home-sticky-nav[data-visible="true"]')).toBeVisible();
  const stickyTrigger = page.locator(".home-sticky-nav .project-menu__trigger");
  await expect(stickyTrigger).toBeVisible();
  await stickyTrigger.click();
  const stickyPanel = page.locator(".home-sticky-nav .project-menu__panel");
  await expect(stickyPanel).toBeVisible();
  await expect(stickyPanel.getByRole("link", { name: /第 26 期 · 博物馆奇妙日/ })).toHaveAttribute(
    "href",
    "/project/waytoagi/26-lanna-museum",
  );

  const stickyBounds = await stickyPanel.evaluate((panel) => {
    const rect = panel.getBoundingClientRect();
    return { left: rect.left, right: rect.right, viewportWidth: window.innerWidth };
  });
  expect(stickyBounds.left).toBeGreaterThanOrEqual(0);
  expect(stickyBounds.right).toBeLessThanOrEqual(stickyBounds.viewportWidth + 1);

  await stickyPanel.getByRole("link", { name: /第 26 期 · 博物馆奇妙日/ }).click();
  await expect(page).toHaveURL(/\/project\/waytoagi\/26-lanna-museum$/);
});

test("activity timeline keeps future and completed events around NOW", async ({ page }, testInfo) => {
  await page.goto(`/?__activityNow=${encodeURIComponent(new Date(ACTIVITY_TIMELINE_TEST_NOW).toISOString())}`, {
    waitUntil: "domcontentloaded",
  });
  const section = page.locator(".activity-timeline");
  const expected = expectedActivityTimeline(ACTIVITY_TIMELINE_TEST_NOW);
  const active = [...expected.ongoing, ...expected.upcoming];
  const displayed = [...active, ...expected.completed];
  await expect(section).toBeVisible();
  await expect(section.getByRole("heading", { name: "最近，可以一起做什么" })).toBeVisible();
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
    const expectedStatus = expected.ongoing.includes(activity) ? "进行中" : "即将举行";
    await expect(activeCards.nth(index).locator(".activity-timeline__status")).toHaveText(expectedStatus);
    await expect(activeCards.nth(index).getByRole("link", { name: /查看活动详情/ })).toHaveAttribute(
      "href",
      `/events/${activity.posterKey.slice(9,-5)}`,
    );
  }
  if (await page.locator("#event-museum .cmi-poster-wall").count()) {
    for (const activity of expected.museumReady) {
      await expect(page.locator(`[data-poster-key="${activity.posterKey}"]`).first()).toBeAttached();
    }
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
  await expect(poster).toBeVisible();
  await expect.poll(() => poster.evaluate((image: HTMLImageElement) => image.naturalWidth)).toBeGreaterThan(0);
  const detail = selectedCard.getByRole("link", { name: /查看活动详情/ });
  await expect(detail).toHaveAttribute("href", `/events/${selected.posterKey.slice(9,-5)}`);
  await expect(detail).toHaveAttribute("target", "_blank");

  if (testInfo.project.name === "desktop-chromium") {
    await posterButton.hover({ position: { x: 20, y: 40 } });
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
  await expect(dialog.getByText(selected.timeLabel)).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
  await expect(posterButton).toBeFocused();
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
  await page.goto("/", { waitUntil: "domcontentloaded" });
  const dimensions = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
  }));
  expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.clientWidth + 1);

  await page.route("**/local-assets/**", (route) => route.abort());
  await page.goto("/archive/posters");
  const archiveDimensions = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
  }));
  expect(archiveDimensions.scrollWidth).toBeLessThanOrEqual(archiveDimensions.clientWidth + 1);
});

test("poster wall keeps time ordering independent of synchronous and differential motion", async ({ page }) => {
  await page.goto("/?__activityNow=2026-09-19T08%3A00%3A00.000Z", { waitUntil: "domcontentloaded" });
  const wall = page.locator("#event-museum .cmi-poster-wall");
  await wall.scrollIntoViewIfNeeded();
  await expect(wall).toHaveAttribute("data-scroll-style", "sync");
  await expect(wall.locator(".cmi-flow-wall")).toHaveClass(/cmi-flow-wall--up/);
  await expect(wall.locator(".cmi-flow-track")).toHaveCount(1);
  const open = wall.locator(".cmi-controls-entry");
  if (await open.isVisible()) await open.click();
  const exactEvents = ACTIVITY_EXPECTATIONS.filter(event => !event.dateLabel.includes("补录"));
  const exactKeys = new Set(exactEvents.map(event => event.posterKey));
  const orderedKeys = () => wall.locator(".cmi-flow-set").first().locator("[data-poster-key]")
    .evaluateAll(nodes => [...new Set(nodes.map(node => node.getAttribute("data-poster-key")!))])
    .then(keys => keys.filter(key => exactKeys.has(key as typeof exactEvents[number]["posterKey"])));
  await expect.poll(orderedKeys).toEqual([...exactEvents].sort((a, b) => b.startsAt - a.startsAt).map(event => event.posterKey));
  await wall.getByRole("button", { name: "时间正序（过去 → 未来）", exact: true }).click();
  await expect.poll(orderedKeys).toEqual([...exactEvents].sort((a, b) => a.startsAt - b.startsAt).map(event => event.posterKey));

  const displacement = await wall.locator(".cmi-flow-track").evaluate(element => {
    const animation = element.getAnimations()[0];
    if (!animation) throw new Error("The synchronous wall did not animate");
    animation.pause();
    const tiles = Array.from(element.querySelectorAll(".cmi-flow-set:first-child .cmi-poster-tile")).slice(0, 3);
    animation.currentTime = 1000;
    const before = tiles.map(tile => tile.getBoundingClientRect().y);
    animation.currentTime = 2000;
    const deltas = tiles.map((tile, index) => tile.getBoundingClientRect().y - before[index]);
    animation.play();
    return deltas;
  });
  expect(displacement[0]).toBeLessThan(-1);
  for (const delta of displacement) expect(delta).toBeCloseTo(displacement[0], 2);
  await wall.getByRole("button", { name: "暂停", exact: true }).click();
  await expect.poll(() => wall.locator(".cmi-flow-track").evaluate(element => getComputedStyle(element).animationPlayState)).toBe("paused");
  await wall.getByRole("button", { name: "继续", exact: true }).click();
  await wall.getByRole("button", { name: "差速滚动", exact: true }).click();
  await expect(wall).toHaveAttribute("data-sort-order", "date-asc");
  await expect(wall.getByRole("button", { name: "差速滚动", exact: true })).toHaveAttribute("aria-pressed", "true");
  expect(await wall.locator(".cmi-flow-track").count()).toBeGreaterThan(1);
  await wall.getByRole("button", { name: "同步滚动", exact: true }).click();
  await wall.getByRole("button", { name: "向左", exact: true }).click();
  await expect(wall.locator(".cmi-flow-wall")).toHaveClass(/cmi-flow-wall--left/);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect.poll(() => wall.locator(".cmi-flow-track").evaluate(element => getComputedStyle(element).animationName)).toBe("none");
  await page.goto("/archive/posters");
  await expect(page.locator(".cmi-poster-wall")).toHaveAttribute("data-sort-order", "date-desc");
  await expect(page.locator(".cmi-poster-wall")).toHaveAttribute("data-scroll-style", "sync");
  const archiveControls = page.locator(".cmi-controls-entry");
  if (await archiveControls.isVisible()) await archiveControls.click();
  await page.getByRole("button", { name: "翻转墙", exact: true }).click();
  await expect(page.locator(".cmi-flip-cell").first()).toBeVisible();
  await page.getByRole("button", { name: "流动墙", exact: true }).click();
  await expect(page.locator(".cmi-flow-wall--sync")).toBeVisible();
});

test("poster random order stays stable and color order follows actual image pixels", async ({ page }) => {
  test.setTimeout(60_000);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/archive/posters", { waitUntil: "domcontentloaded" });
  const wall = page.locator(".cmi-poster-wall");
  const open = wall.locator(".cmi-controls-entry");
  if (await open.isVisible()) await open.click();
  const keys = () => wall.locator(".cmi-flow-set").first().locator("[data-poster-key]").evaluateAll(nodes => [...new Set(nodes.map(node => node.getAttribute("data-poster-key")!))]);
  const chronological = await keys();
  await wall.getByRole("button", { name: "随机排序", exact: true }).click();
  const firstShuffle = await keys();
  expect([...firstShuffle].sort()).toEqual([...chronological].sort());
  expect(firstShuffle).not.toEqual(chronological);
  await wall.getByRole("button", { name: "差速滚动", exact: true }).click();
  await wall.getByRole("button", { name: "同步滚动", exact: true }).click();
  expect(await keys()).toEqual(firstShuffle);
  await wall.getByRole("button", { name: "重新打乱", exact: true }).click();
  expect(await keys()).not.toEqual(firstShuffle);
  // Deliberately reverse the chronological hue order. Canvas must read these
  // bytes, rather than guessing a palette from dates, ids or poster titles.
  const palette = [[150, 0, 255], [0, 0, 255], [0, 255, 255], [0, 255, 0], [255, 255, 0], [255, 120, 0], [255, 0, 0]];
  const sourceToIndex = await wall.locator(".cmi-flow-set").first().locator(".cmi-poster-tile").evaluateAll(nodes => nodes.map(node => ({ id: node.getAttribute("data-poster-key")!, src: node.querySelector("img")!.getAttribute("src")! })));
  let failImage = false;
  const imageRoute = async (route: import("@playwright/test").Route) => {
    const pathname = new URL(route.request().url()).pathname;
    let id = sourceToIndex.find(row => new URL(row.src, "http://local").pathname === pathname)?.id;
    if (pathname.startsWith("/media/poster-colors/")) id = decodeURIComponent(pathname.split("/").at(-1)!);
    if (!id) return route.continue();
    if (failImage) return route.fulfill({ status: 404, body: "Synthetic image unavailable" });
    const color = palette[chronological.indexOf(id) % palette.length];
    return route.fulfill({ contentType: "image/png", body: patternPng(48, 48, [color, color]) });
  };
  await page.route("**/*", imageRoute);
  await wall.getByRole("button", { name: "色彩排序（按色谱）", exact: true }).click();
  await expect(wall.getByRole("status")).toContainText("红 → 紫", { timeout: 30_000 });
  const byHue = await keys();
  const expected = [...chronological].sort((a, b) => (6 - chronological.indexOf(a) % 7) - (6 - chronological.indexOf(b) % 7));
  await expect.poll(keys).toEqual(expected);
  expect(byHue).not.toEqual(chronological);
  await wall.getByRole("button", { name: "差速滚动", exact: true }).click();
  await expect(wall).toHaveAttribute("data-sort-order", "color");
  const absent = await page.request.get("/media/poster-colors/synthetic-missing.webp");
  expect(absent.status()).toBe(404);
  expect((await page.request.post("/media/poster-colors/synthetic-missing.webp")).status()).toBe(405);
  // A new document has a fresh session cache. Fail every analysis image and
  // confirm that the wall remains usable with an honest retry state.
  failImage = true;
  await page.reload({ waitUntil: "domcontentloaded" });
  if (await open.isVisible()) await open.click();
  await wall.getByRole("button", { name: "色彩排序（按色谱）", exact: true }).click();
  await expect(wall.getByRole("status")).toContainText("张未能分析", { timeout: 30_000 });
  await expect(wall.getByRole("button", { name: "重试分析", exact: true })).toBeVisible();
  expect(await keys()).toEqual(chronological);
  await wall.getByRole("button", { name: "时间倒序（未来 → 过去）", exact: true }).click();
  await expect(wall.getByRole("status")).toHaveCount(0);
});

test("activity timeline removes its 3D motion when reduced motion is requested", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto(`/?__activityNow=${encodeURIComponent(new Date(ACTIVITY_TIMELINE_TEST_NOW).toISOString())}`, {
    waitUntil: "domcontentloaded",
  });
  const posterButton = page.locator(".activity-timeline__activity").first().getByRole("button");
  await posterButton.hover({ position: { x: 18, y: 36 } });
  await expect.poll(() => posterButton.locator(".activity-timeline__poster").evaluate(
    (element) => getComputedStyle(element).transform,
  )).toBe("none");
});

test("invite, verification and server-side publishing roles work end to end", async ({ request }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop-chromium", "one shared D1 integration run is sufficient");
  test.setTimeout(60_000);
  const stamp = `${Date.now()}-${Math.floor(Math.random() * 100_000)}`;
  const invitedEmail = `cmi-e2e-${stamp}@example.com`;
  const uninvitedEmail = `cmi-uninvited-${stamp}@example.com`;
  const invitationId = crypto.randomUUID();
  const publishedSlug = `published-${stamp}`;
  const draftSlug = `draft-${stamp}`;
  let userId = "";
  let publishedId = "";
  let draftId = "";

  try {
    d1("DELETE FROM auth_rate_limits;");
    const blocked = await request.post("/api/auth/sign-up/email", {
      headers: { Origin: "http://127.0.0.1:5173" },
      data: { email: uninvitedEmail, password: "Correct-Horse-123!", name: "No Invitation" },
    });
    expect(blocked.status()).toBe(403);
    const rejectedSignup = JSON.parse(d1(
      `SELECT COUNT(*) AS users FROM auth_users WHERE email = '${uninvitedEmail}';`,
    ));
    expect(rejectedSignup[0].results[0].users).toBe(0);

    d1(
      `INSERT INTO invitations (id, email, role, expires_at) VALUES ('${invitationId}', '${invitedEmail}', 'member', datetime('now', '+1 day'));`,
    );
    const signup = await request.post("/api/auth/sign-up/email", {
      headers: { Origin: "http://127.0.0.1:5173" },
      data: { email: invitedEmail, password: "Correct-Horse-123!", name: "Foundation Test" },
    });
    expect(signup.ok()).toBeTruthy();
    userId = (await signup.json()).user.id;

    d1(`UPDATE auth_users SET emailVerified = 1 WHERE id = '${userId}';`);
    const signin = await request.post("/api/auth/sign-in/email", {
      headers: { Origin: "http://127.0.0.1:5173" },
      data: { email: invitedEmail, password: "Correct-Horse-123!" },
    });
    expect(signin.ok()).toBeTruthy();

    const me = await request.get("/api/v1/me");
    await expect(me.json()).resolves.toMatchObject({ user: { id: userId, roles: ["member"] } });

    const deniedDraft = await request.post("/api/v1/content", {
      data: {
        type: "story",
        locale: "zh-CN",
        slug: publishedSlug,
        title: "角色测试",
        body: "member 不应该能够写入。",
      },
    });
    expect(deniedDraft.status()).toBe(403);

    d1(`INSERT INTO user_roles (user_id, role) VALUES ('${userId}', 'editor');`);
    const created = await request.post("/api/v1/content", {
      data: {
        type: "story",
        locale: "zh-CN",
        slug: publishedSlug,
        title: "地基发布测试",
        summary: "公开投影只应保留白名单字段。",
        body: "这是自动化测试内容。",
      },
    });
    expect(created.status()).toBe(201);
    publishedId = (await created.json()).content.id;

    const editorPublish = await request.post(`/api/v1/content/${publishedId}/publish`);
    expect(editorPublish.status()).toBe(403);

    const secondDraft = await request.post("/api/v1/content", {
      data: {
        type: "story",
        locale: "zh-CN",
        slug: draftSlug,
        title: "不应公开的草稿",
        body: "草稿内容。",
      },
    });
    draftId = (await secondDraft.json()).content.id;

    d1(`INSERT INTO user_roles (user_id, role) VALUES ('${userId}', 'admin');`);
    const published = await request.post(`/api/v1/content/${publishedId}/publish`);
    expect(published.ok()).toBeTruthy();

    const publicList = await request.get("/api/v1/content?locale=zh-CN");
    const publicPayload = await publicList.json();
    expect(publicPayload.content.map((entry: { id: string }) => entry.id)).toContain(publishedId);
    expect(publicPayload.content.map((entry: { id: string }) => entry.id)).not.toContain(draftId);
    expect(JSON.stringify(publicPayload)).not.toMatch(/created_by|updated_by|published_by/);

    const evidence = JSON.parse(
      d1(
        `SELECT (SELECT COUNT(*) FROM content_revisions WHERE content_id = '${publishedId}') AS revisions, (SELECT COUNT(*) FROM audit_logs WHERE resource_id = '${publishedId}' AND action = 'content.published') AS audits;`,
      ),
    );
    expect(evidence[0].results[0]).toMatchObject({ revisions: 1, audits: 1 });
  } finally {
    if (userId) {
      d1(
        `DELETE FROM audit_logs WHERE actor_user_id = '${userId}' OR resource_id IN ('${publishedId}', '${draftId}'); DELETE FROM content_entries WHERE created_by = '${userId}'; DELETE FROM auth_users WHERE id = '${userId}';`,
      );
    }
    d1(`DELETE FROM invitations WHERE id = '${invitationId}';`);
    d1("DELETE FROM auth_rate_limits;");
  }
});
