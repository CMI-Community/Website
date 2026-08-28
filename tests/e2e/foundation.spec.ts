import { execFileSync } from "node:child_process";
import { expect, test } from "@playwright/test";
import { defineLannaProjectTests } from "./lanna-tests";

defineLannaProjectTests();

const WAYTOAGI_ACTIVITY_URL = "https://mp.weixin.qq.com/s/lBZWJ7kA4iqIMNnvEqxvyg";
const ACTIVITY_EXPECTATIONS = [
  {
    startsAt: Date.parse("2026-08-28T16:00:00+07:00"),
    title: "CMI 吃饭俱乐部 #1 · 周五《牛来》观影",
    detailUrl: "https://mp.weixin.qq.com/s/0Z1DTbX93zrAfwlCVxjzGg",
    dateLabel: "2026.08.28 · 周五",
    timeLabel: "16:00–20:00 · 清迈时间",
    posterKey: "activity-cmi-dinner-club-01-niulai-screening.webp",
  },
  {
    startsAt: Date.parse("2026-08-29T07:00:00+07:00"),
    title: "8月29日｜ 清迈新云南市场 CMI 社区义卖 #1",
    detailUrl: "https://mp.weixin.qq.com/s/SW_BaQ3eFgWgsYBxWoftlQ",
    dateLabel: "2026.08.29 · 周六",
    timeLabel: "07:00–12:00 · 清迈时间",
    posterKey: "activity-cmi-community-sale-01-new-yunnan-market.webp",
  },
  {
    startsAt: Date.parse("2026-08-30T12:30:00+07:00"),
    title: "即兴戏剧 + AI 短剧共创",
    detailUrl: WAYTOAGI_ACTIVITY_URL,
    dateLabel: "2026.08.30 · 周日",
    timeLabel: "12:30–17:30 · 清迈时间",
    posterKey: "activity-waytoagi-27-improv-ai-shortfilm.webp",
  },
] as const;

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
  await page.goto("/");
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
  const homepageRequests: string[] = [];
  page.on("request", (request) => homepageRequests.push(request.url()));
  await page.goto("/");

  const heroTrigger = page.locator(".home-hero__topline .project-menu__trigger");
  await expect(heroTrigger).toBeVisible();
  await expect(heroTrigger).toHaveAccessibleName("Projects 项目系列");
  await expect(page.locator(".home-sticky-nav .project-menu__trigger")).toHaveCount(0);

  await heroTrigger.focus();
  await page.keyboard.press("Enter");
  const heroPanel = page.locator(".home-hero__topline .project-menu__panel");
  await expect(heroPanel).toBeVisible();
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

test("upcoming activities are nearest-first, tilt, expand and move into Event Museum", async ({ page }, testInfo) => {
  await page.goto("/");
  const section = page.locator(".upcoming-activities");
  const now = Date.now();
  const upcoming = ACTIVITY_EXPECTATIONS.filter((activity) => activity.startsAt > now);
  const started = ACTIVITY_EXPECTATIONS.filter((activity) => activity.startsAt <= now);
  if (upcoming.length === 0) {
    await expect(section).toHaveCount(0);
    if (await page.locator("#event-museum .cmi-poster-wall").count()) {
      for (const activity of started) {
        await expect(page.locator(`[data-poster-key="${activity.posterKey}"]`)).toBeAttached();
      }
    }
    return;
  }

  await expect(section).toBeVisible();
  await expect(section.getByRole("heading", { name: "最近，可以一起做什么" })).toBeVisible();
  const cards = section.locator(".upcoming-activity");
  await expect(cards).toHaveCount(upcoming.length);
  await expect(cards.locator("h3")).toHaveText(upcoming.map((activity) => activity.title));
  for (const [index, activity] of upcoming.entries()) {
    await expect(cards.nth(index).getByRole("link", { name: /查看详情/ })).toHaveAttribute(
      "href",
      activity.detailUrl,
    );
  }
  if (await page.locator("#event-museum .cmi-poster-wall").count()) {
    for (const activity of started) {
      await expect(page.locator(`[data-poster-key="${activity.posterKey}"]`)).toBeAttached();
    }
  }

  const selected = upcoming[0]!;
  const posterButton = cards.nth(0).getByRole("button", {
    name: `放大海报：${selected.title}`,
  });
  const poster = posterButton.locator("img");
  await expect(poster).toBeVisible();
  await expect.poll(() => poster.evaluate((image: HTMLImageElement) => image.naturalWidth)).toBeGreaterThan(0);
  const selectedCard = posterButton.locator("xpath=ancestor::article");
  const detail = selectedCard.getByRole("link", { name: /查看详情/ });
  await expect(detail).toHaveAttribute("href", selected.detailUrl);
  await expect(detail).toHaveAttribute("target", "_blank");

  if (testInfo.project.name === "desktop-chromium") {
    await posterButton.hover({ position: { x: 20, y: 40 } });
    await expect.poll(() => posterButton.locator(".upcoming-activity__poster").evaluate(
      (element) => getComputedStyle(element).transform,
    )).not.toBe("none");
  }

  await posterButton.click();
  const dialog = page.getByRole("dialog", { name: selected.title });
  await expect(dialog).toBeVisible();
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
  await page.goto("/");
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

test("upcoming activity removes its 3D motion when reduced motion is requested", async ({ page }) => {
  test.skip(
    ACTIVITY_EXPECTATIONS.every((activity) => activity.startsAt <= Date.now()),
    "all activities have already moved to Event Museum",
  );
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  const posterButton = page.locator(".upcoming-activity").first().getByRole("button");
  await posterButton.hover({ position: { x: 18, y: 36 } });
  await expect.poll(() => posterButton.locator(".upcoming-activity__poster").evaluate(
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
