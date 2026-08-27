import { execFileSync } from "node:child_process";
import { expect, test } from "@playwright/test";

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
  await expect(page.locator('.home-social__item[href="https://discord.gg/BbaPPTRr9d"]')).toBeVisible();
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
  await page.goto("/");

  const heroTrigger = page.locator(".home-hero__topline .project-menu__trigger");
  await expect(heroTrigger).toBeVisible();
  await expect(heroTrigger).toHaveAccessibleName("Projects 项目系列");
  await expect(page.locator(".home-sticky-nav .project-menu__trigger")).toHaveCount(0);

  await heroTrigger.focus();
  await page.keyboard.press("Enter");
  const heroPanel = page.locator(".home-hero__topline .project-menu__panel");
  await expect(heroPanel).toBeVisible();
  await expect(heroPanel.getByText("WaytoAGI 切磋大会 · 清迈场")).toBeVisible();
  await expect(heroPanel.getByText("WaytoAGI 发起 · CMI Community 组织清迈场")).toBeVisible();
  const heroIssue = heroPanel.locator("a");
  await expect(heroIssue).toContainText("第 26 期 · 博物馆奇妙日");
  await expect(heroIssue).toContainText("2026.07.26");
  await expect(heroIssue).toHaveAttribute("href", "https://lanna-museum-day-chiang-mai.vercel.app/");
  await expect(heroIssue).toHaveAttribute("target", "_blank");
  await expect(heroIssue).toHaveAttribute("rel", "noreferrer");

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
  await heroPanel.locator("a").evaluate((link) => {
    link.addEventListener("click", (event) => event.preventDefault(), { once: true });
  });
  await heroPanel.locator("a").click();
  await expect(heroPanel).toHaveCount(0);
  await expect(heroTrigger).toBeFocused();

  await heroTrigger.click();
  await page.locator("#home-title").click();
  await expect(heroPanel).toHaveCount(0);

  await page.locator('.home-museum-entries a[href="#photo-museum"]').click();
  await expect(page.locator('.home-sticky-nav[data-visible="true"]')).toBeVisible();
  const stickyTrigger = page.locator(".home-sticky-nav .project-menu__trigger");
  await expect(stickyTrigger).toBeVisible();
  await stickyTrigger.click();
  const stickyPanel = page.locator(".home-sticky-nav .project-menu__panel");
  await expect(stickyPanel).toBeVisible();
  await expect(stickyPanel.locator("a")).toHaveAttribute(
    "href",
    "https://lanna-museum-day-chiang-mai.vercel.app/",
  );

  const stickyBounds = await stickyPanel.evaluate((panel) => {
    const rect = panel.getBoundingClientRect();
    return { left: rect.left, right: rect.right, viewportWidth: window.innerWidth };
  });
  expect(stickyBounds.left).toBeGreaterThanOrEqual(0);
  expect(stickyBounds.right).toBeLessThanOrEqual(stickyBounds.viewportWidth + 1);
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

test("invite, verification and server-side publishing roles work end to end", async ({ request }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop-chromium", "one shared D1 integration run is sufficient");
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
