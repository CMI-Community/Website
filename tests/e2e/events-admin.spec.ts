import { createHmac, randomUUID } from "node:crypto";
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test, expect, type BrowserContext } from "@playwright/test";

const fixtureSessionIds: string[] = [];
function localAdminCookie() {
  const config = Object.fromEntries(
    readFileSync(".dev.vars", "utf8")
      .split(/\r?\n/)
      .map((line) => line.match(/^([A-Z_]+)=(.*)$/))
      .filter(Boolean)
      .map((match) => [match![1], match![2].replace(/^['"]|['"]$/g, "")]),
  );
  if (!config.BETTER_AUTH_SECRET || !config.EVENT_ADMIN_EMAIL)
    throw new Error(
      "Local E2E requires BETTER_AUTH_SECRET and EVENT_ADMIN_EMAIL in .dev.vars.",
    );
  const id = `events-e2e-${randomUUID()}`;
  fixtureSessionIds.push(id);
  const token = randomUUID();
  const now = Date.now();
  const quote = (s: string) => `'${s.replaceAll("'", "''")}'`;
  const sql = `INSERT OR IGNORE INTO auth_users(id,name,email,emailVerified,createdAt,updatedAt) VALUES(${quote(id)},'Synthetic administrator',${quote(config.EVENT_ADMIN_EMAIL)},1,${quote(new Date(now).toISOString())},${quote(new Date(now).toISOString())}); INSERT OR IGNORE INTO user_roles(user_id,role) SELECT id,'admin' FROM auth_users WHERE email=${quote(config.EVENT_ADMIN_EMAIL)}; INSERT INTO auth_sessions(id,userId,token,expiresAt,createdAt,updatedAt) SELECT ${quote(id)},id,${quote(token)},${quote(new Date(now + 3600_000).toISOString())},${quote(new Date(now).toISOString())},${quote(new Date(now).toISOString())} FROM auth_users WHERE email=${quote(config.EVENT_ADMIN_EMAIL)}; INSERT INTO event_admin_otp_sessions(session_id,verified_at) VALUES(${quote(id)},${quote(new Date().toISOString())});`;
  const fixtureDir = mkdtempSync(join(tmpdir(), "cmi-event-e2e-"));
  const fixtureFile = join(fixtureDir, "session.sql");
  writeFileSync(fixtureFile, sql, { mode: 0o600 });
  try {
    execFileSync(
      "npx",
      [
        "wrangler",
        "d1",
        "execute",
        "DB",
        "--local",
        "--file",
        fixtureFile,
        "--json",
      ],
      { stdio: "pipe" },
    );
  } catch {
    throw new Error(
      "Local admin fixture SQL did not complete; inspect the isolated local D1 schema.",
    );
  } finally {
    rmSync(fixtureDir, { recursive: true });
  }
  return {
    name: "better-auth.session_token",
    value: encodeURIComponent(
      `${token}.${createHmac("sha256", config.BETTER_AUTH_SECRET).update(token).digest("base64")}`,
    ),
    url: "http://127.0.0.1:5173",
    httpOnly: true,
    sameSite: "Lax" as const,
  };
}
async function signIn(context: BrowserContext) {
  await context.addCookies([localAdminCookie()]);
}

test.beforeEach(async ({ page }) => {
  await page.route("**/local-assets/**", (route) => route.abort());
});

test.afterAll(() => {
  if (fixtureSessionIds.length)
    execFileSync(
      "npx",
      [
        "wrangler",
        "d1",
        "execute",
        "DB",
        "--local",
        "--command",
        `DELETE FROM auth_sessions WHERE id IN (${fixtureSessionIds.map((id) => `'${id}'`).join(",")})`,
        "--json",
      ],
      { stdio: "pipe" },
    );
});

test("event admin rejects anonymous visitors and explains OTP login", async ({
  page,
}) => {
  await page.goto("/admin/events");
  await expect(page).toHaveURL(/\/admin\/login$/);
  await expect(page.getByRole("heading", { name: "管理员登录" })).toBeVisible();
  await expect(page.getByLabel("邮箱")).toHaveValue("");
  await page.route("**/api/auth/email-otp/send-verification-otp", (route) =>
    route.fulfill({
      status: 403,
      contentType: "application/json",
      body: JSON.stringify({
        error: { code: "FORBIDDEN", message: "此邮箱未获授权。" },
      }),
    }),
  );
  await page.getByLabel("邮箱").fill("synthetic@example.com");
  await page.getByRole("button", { name: "发送验证码" }).click();
  await expect(page.getByRole("alert")).toContainText("未获授权");
});

test("admin creates, previews, publishes, edits and unpublishes a real local event", async ({
  page,
  context,
  request,
}) => {
  test.setTimeout(120_000);
  await signIn(context);
  let createdId = "";
  try {
    await page.goto("/admin/events/new");
    await expect(page.getByRole("heading", { name: "新增活动" })).toBeVisible();
    const title = `本地合成活动 ${randomUUID().slice(0, 8)}`;
    await page.getByLabel("活动标题 *", { exact: true }).fill(title);
    await page
      .getByLabel("开始时间 *", { exact: true })
      .fill("2026-10-31T14:00");
    await page
      .getByLabel("结束时间 *", { exact: true })
      .fill("2026-10-31T16:00");
    await page.getByLabel("活动地点 *", { exact: true }).fill("本地测试场地");
    await page.getByLabel("分类 *", { exact: true }).fill("合成测试");
    await page
      .getByLabel("简介 *")
      .fill("这是一条用于本地端到端验证的合成活动。");
    await page
      .getByLabel("上传海报 *")
      .setInputFiles({
        name: "synthetic.png",
        mimeType: "image/png",
        buffer: Buffer.from(
          "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+yD0sAAAAASUVORK5CYII=",
          "base64",
        ),
      });
    await expect(page.getByRole("status")).toContainText("海报上传完成");
    await page.getByRole("button", { name: "预览", exact: true }).click();
    await expect(page.getByRole("dialog", { name: "活动预览" })).toContainText(
      title,
    );
    await page.getByRole("button", { name: "关闭预览 ×" }).click();
    await page.getByRole("button", { name: "保存草稿", exact: true }).click();
    await expect(page.getByRole("status")).toContainText("活动已保存");
    const id = new URL(page.url()).pathname.split("/").at(-1)!;
    expect(id).not.toBe("new");
    createdId = id;
    expect((await request.get(`/events/${id}`)).status()).toBe(404);
    await page.getByRole("button", { name: "发布活动", exact: true }).click();
    await expect(page.getByRole("status")).toContainText("活动已发布");
    const detail = await request.get(`/api/v1/events/${id}`);
    expect(detail.ok()).toBe(true);
    const publicPage = await context.newPage();
    await publicPage.goto(`/events/${id}`);
    await expect(
      publicPage.getByRole("heading", { name: title }),
    ).toBeVisible();
    await expect(publicPage.getByText("地点：本地测试场地")).toBeVisible();
    const mediaUrl = await publicPage
      .locator("article>img")
      .getAttribute("src");
    expect((await request.get(mediaUrl!)).status()).toBe(200);
    await publicPage.goto("/", { waitUntil: "domcontentloaded" });
    await expect(
      publicPage.getByRole("heading", { name: title, exact: true }),
    ).toBeVisible();
    await expect(
      publicPage.locator(`[data-poster-key="activity-${id}.webp"]`).first(),
    ).toBeAttached();
    await publicPage.goto("/archive/posters", {
      waitUntil: "domcontentloaded",
    });
    await expect(
      publicPage.locator(`[data-poster-key="activity-${id}.webp"]`).first(),
    ).toBeAttached();
    await publicPage.close();
    await page
      .getByLabel("活动标题 *", { exact: true })
      .fill(title + " · 已修改");
    await page.getByRole("button", { name: "保存并公开", exact: true }).click();
    await expect(page.getByRole("status")).toContainText("活动已发布");
    await page.getByRole("button", { name: "下架活动", exact: true }).click();
    await page.getByRole("button", { name: "确认下架", exact: true }).click();
    await expect(page.getByRole("status")).toContainText("活动已下架");
    expect((await request.get(`/events/${id}`)).status()).toBe(404);
    expect((await request.get(mediaUrl!)).status()).toBe(404);
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await expect(
      page.getByRole("heading", { name: title + " · 已修改", exact: true }),
    ).toHaveCount(0);
    await page.goto("/archive/posters", { waitUntil: "domcontentloaded" });
    await expect(
      page.locator(`[data-poster-key="activity-${id}.webp"]`),
    ).toHaveCount(0);
  } finally {
    if (createdId) {
      const current = await context.request.get(
        `/api/v1/admin/events/${createdId}`,
      );
      if (current.ok()) {
        const body = await current.json();
        if (body.event.status === "published") {
          await context.request.patch(`/api/v1/admin/events/${createdId}`, {
            headers: {
              Origin: "http://127.0.0.1:5173",
              "If-Match": `"v${body.event.version}"`,
            },
            data: { status: "unpublished" },
          });
        }
      }
    }
  }
});

test("API authorization defaults to seven-day drafts and supports revocation", async ({
  page,
  context,
}) => {
  test.setTimeout(90_000);
  await signIn(context);
  await page.goto("/admin/api-keys");
  await expect(
    page.getByRole("heading", { name: "API 授权", exact: true }),
  ).toBeVisible();
  await expect(page.getByLabel("有效期（天）")).toHaveValue("7");
  await expect(
    page.getByLabel("新建、修改草稿", { exact: true }),
  ).toBeChecked();
  await expect(page.getByLabel("上传海报", { exact: true })).toBeChecked();
  await expect(
    page.getByLabel("发布及修改已公开活动", { exact: true }),
  ).not.toBeChecked();
  const name = "本地验证 " + randomUUID().slice(0, 8);
  await page.getByLabel("名称 *", { exact: true }).fill(name);
  await page.getByRole("button", { name: "签发密钥", exact: true }).click();
  await expect(page.getByLabel("新签发的密钥")).toHaveValue(/.+/);
  await page.getByRole("button", { name: "已保存，隐藏密钥" }).click();
  await expect(page.getByLabel("新签发的密钥")).toHaveCount(0);
  const item = page
    .locator(".event-admin__list article")
    .filter({ has: page.getByRole("heading", { name, exact: true }) });
  await item.getByRole("button", { name: "撤销", exact: true }).click();
  await page.getByRole("button", { name: "确认撤销", exact: true }).click();
  await expect(item).toContainText("已撤销");
});
