import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { Miniflare } from "miniflare";
import { createHash } from "node:crypto";
import { handleActivityApi } from "../workers/activity-api";
import { handleV1Api } from "../workers/api";
import { handleEventMedia, inspectImage } from "../workers/event-media";
import { createAuth } from "../workers/auth";
import {
  integrationWriteGuard,
  parseKeyInput,
  sha256,
  type IntegrationKey,
} from "../workers/integration-auth";
import { saveEvent } from "../app/modules/activities/event-service.server";

describe("活动授权接口（隔离 D1 与私有 R2）", () => {
  let mf: Miniflare;
  let env: CloudflareEnv;
  let db: D1Database;
  const ctx = {
    waitUntil: () => {},
    passThroughOnException: () => {},
  } as unknown as ExecutionContext;
  const adminId = "test-admin";
  const email = "activity-admin@example.com";
  const token = `cmi_evt_${"A".repeat(43)}`;
  const source = "test-agent";
  let adminCookie = "";
  let uploadedMediaId = "";
  const eventInput = {
    title: "接口测试活动",
    startsAt: "2026-11-20T14:00:00+07:00",
    endsAt: "2026-11-20T16:00:00+07:00",
    location: "测试场地",
    category: "测试",
    summary: "隔离数据",
    posterMediaId: "test-poster",
    status: "draft",
  };
  const png = Uint8Array.from(
    Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aNncAAAAASUVORK5CYII=",
      "base64",
    ),
  );
  function request(
    path: string,
    method = "GET",
    body?: unknown,
    headers: Record<string, string> = {},
  ) {
    return new Request(`http://localhost:5173${path}`, {
      method,
      headers: {
        authorization: `Bearer ${token}`,
        "content-type": "application/json",
        ...headers,
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
  }
  async function call(
    path: string,
    method = "GET",
    body?: unknown,
    headers: Record<string, string> = {},
  ) {
    const response = await handleActivityApi(
      request(path, method, body, headers),
      env,
      ctx,
    );
    if (!response) throw new Error("Missing endpoint");
    return {
      response,
      body: (await response.json()) as {
        event?: { id: string; version: number; status: string };
        error?: { code: string };
        token?: string;
      },
    };
  }
  beforeAll(async () => {
    mf = new Miniflare({
      modules: true,
      script: "export default {fetch(){return new Response('ok')}}",
      compatibilityDate: "2026-08-01",
      d1Databases: ["DB"],
      r2Buckets: ["EVENT_MEDIA", "EVENT_BACKUPS"],
    });
    db = (await mf.getD1Database("DB")) as unknown as D1Database;
    for (const file of readdirSync("migrations")
      .filter((name) => name.endsWith(".sql"))
      .sort()) {
      const sql = readFileSync(`migrations/${file}`, "utf8").replace(
        /^--.*$/gm,
        "",
      );
      for (const statement of sql
        .split(/;\s*(?:\n|$)/)
        .filter((value) => value.trim()))
        await db.prepare(statement).run();
    }
    const now = Date.now();
    await db
      .prepare(
        "INSERT INTO auth_users(id,name,email,emailVerified,createdAt,updatedAt) VALUES(?1,'Synthetic admin',?2,1,?3,?3)",
      )
      .bind(adminId, email, now)
      .run();
    await db
      .prepare("INSERT INTO user_roles(user_id,role) VALUES(?1,'admin')")
      .bind(adminId)
      .run();
    await db
      .prepare(
        "INSERT INTO integration_api_keys(id,name,token_hash,token_prefix,source,permissions_json,scope_json,epoch,created_by,created_at,expires_at) VALUES('test-key','Test',?1,'cmi_evt_',?2,?3,'{\"type\":\"source\"}','test-epoch',?4,?5,?6)",
      )
      .bind(
        await sha256(token),
        source,
        JSON.stringify(["events:read", "events:write", "media:write"]),
        adminId,
        new Date().toISOString(),
        new Date(now + 86400_000).toISOString(),
      )
      .run();
    await db
      .prepare(
        "INSERT INTO media_assets(id,object_key,mime_type,byte_size,status,created_by) VALUES('test-poster','events/test/poster.png','image/png',68,'ready',?1)",
      )
      .bind(adminId)
      .run();
    await db
      .prepare(
        "INSERT INTO event_media(media_id,width,height,source,key_id,storage,verified_at) VALUES('test-poster',1,1,?1,'test-key','private',?2)",
      )
      .bind(source, new Date().toISOString())
      .run();
    env = {
      DB: db,
      APP_ENV: "development",
      BETTER_AUTH_URL: "http://localhost:5173",
      BETTER_AUTH_SECRET: "local-test-secret-at-least-32-characters",
      EVENT_ADMIN_EMAIL: email,
      INTEGRATION_KEY_EPOCH: "test-epoch",
      EVENT_MEDIA: await mf.getR2Bucket("EVENT_MEDIA"),
      EVENT_BACKUPS: await mf.getR2Bucket("EVENT_BACKUPS"),
    } as unknown as CloudflareEnv;
    await env.EVENT_MEDIA.put("events/test/poster.png", png);
  }, 60_000);
  afterAll(async () => {
    await mf?.dispose();
  });

  test("密钥默认只授予草稿编辑、上传和7天期限", () => {
    const value = parseKeyInput({ name: "Agent", source: "new-agent" });
    expect(value.permissions).toEqual(["events:write", "media:write"]);
    expect(value.expiresInDays).toBe(7);
  });
  test("校验实际图片签名和尺寸，拒绝SVG、伪类型与截断文件", () => {
    expect(inspectImage(png.buffer)).toMatchObject({
      width: 1,
      height: 1,
      mimeType: "image/png",
    });
    expect(() =>
      inspectImage(new TextEncoder().encode("<svg></svg>").buffer),
    ).toThrow();
    expect(() => inspectImage(png.slice(0, 35).buffer)).toThrow();
  });
  test("OTP拒绝非管理员邮箱且不创建会话", async () => {
    const auth = createAuth(env, ctx);
    const result = await auth.handler(
      request(
        "/api/auth/email-otp/send-verification-otp",
        "POST",
        { email: "someone@example.com", type: "sign-in" },
        { origin: "http://localhost:5173" },
      ),
    );
    expect(result.status).toBe(403);
    expect(
      await db.prepare("SELECT count(*) AS n FROM auth_sessions").first("n"),
    ).toBe(0);
  });
  test("真实OTP核验一次性消费，签发需近期OTP且只返回一次原文", async () => {
    const otp = "937625",
      now = new Date().toISOString();
    await db
      .prepare(
        "INSERT INTO auth_verifications(id,identifier,value,expiresAt,createdAt,updatedAt) VALUES(?1,?2,?3,?4,?5,?5)",
      )
      .bind(
        crypto.randomUUID(),
        `sign-in-otp-${email}`,
        `${createHash("sha256").update(otp).digest("base64url")}:0`,
        new Date(Date.now() + 300_000).toISOString(),
        now,
      )
      .run();
    const auth = createAuth(env, ctx);
    const signin = await auth.handler(
      request(
        "/api/auth/sign-in/email-otp",
        "POST",
        { email, otp },
        { origin: "http://localhost:5173" },
      ),
    );
    expect(signin.status).toBe(200);
    adminCookie = signin.headers
      .getSetCookie()
      .map((cookie) => cookie.split(";")[0])
      .join("; ");
    expect(adminCookie).toContain("better-auth.session_token");
    expect(
      await db
        .prepare(
          "SELECT count(*) AS n FROM content_entries WHERE created_by=?1",
        )
        .bind(adminId)
        .first("n"),
    ).toBe(10);
    expect(
      await db
        .prepare(
          "SELECT count(*) AS n FROM content_revisions WHERE created_by='event-migration-system'",
        )
        .first("n"),
    ).toBe(10);
    expect(
      await db
        .prepare(
          "SELECT count(*) AS n FROM audit_logs WHERE action='event.migration.claimed'",
        )
        .first("n"),
    ).toBe(1);
    const reused = await auth.handler(
      request(
        "/api/auth/sign-in/email-otp",
        "POST",
        { email, otp },
        { origin: "http://localhost:5173" },
      ),
    );
    expect(reused.status).not.toBe(200);
    const headers = { cookie: adminCookie, origin: "http://localhost:5173" };
    const created = await call(
      "/api/v1/admin/api-keys",
      "POST",
      { name: "New Agent", source: "new-agent" },
      headers,
    );
    expect(created.response.status).toBe(201);
    expect(created.body.token).toMatch(/^cmi_evt_/);
    const list = await call(
      "/api/v1/admin/api-keys",
      "GET",
      undefined,
      headers,
    );
    expect(JSON.stringify(list.body)).not.toContain(created.body.token);
    await db
      .prepare(
        "UPDATE event_admin_otp_sessions SET verified_at='2000-01-01T00:00:00Z'",
      )
      .run();
    expect(
      (
        await call(
          "/api/v1/admin/api-keys",
          "POST",
          { name: "Old OTP", source: "old-agent" },
          headers,
        )
      ).body.error?.code,
    ).toBe("RECENT_OTP_REQUIRED");
    await db
      .prepare("UPDATE event_admin_otp_sessions SET verified_at=?1")
      .bind(new Date().toISOString())
      .run();
  });
  test("唯一管理员首次OTP登录创建验证身份、角色和会话证明", async () => {
    const firstEmail = "first-login@example.com",
      otp = "681947",
      now = new Date().toISOString();
    const previous = env.EVENT_ADMIN_EMAIL;
    env.EVENT_ADMIN_EMAIL = firstEmail;
    try {
      await db
        .prepare(
          "INSERT INTO auth_verifications(id,identifier,value,expiresAt,createdAt,updatedAt) VALUES(?1,?2,?3,?4,?5,?5)",
        )
        .bind(
          crypto.randomUUID(),
          `sign-in-otp-${firstEmail}`,
          `${createHash("sha256").update(otp).digest("base64url")}:0`,
          new Date(Date.now() + 300_000).toISOString(),
          now,
        )
        .run();
      const result = await createAuth(env, ctx).handler(
        request(
          "/api/auth/sign-in/email-otp",
          "POST",
          { email: firstEmail, otp, name: "Synthetic first administrator" },
          { origin: "http://localhost:5173" },
        ),
      );
      expect(result.status).toBe(200);
      const user = await db
        .prepare("SELECT id,emailVerified FROM auth_users WHERE email=?1")
        .bind(firstEmail)
        .first<{ id: string; emailVerified: number }>();
      expect(user?.emailVerified).toBe(1);
      expect(
        await db
          .prepare(
            "SELECT role FROM user_roles WHERE user_id=?1 AND role='admin'",
          )
          .bind(user!.id)
          .first("role"),
      ).toBe("admin");
      expect(
        await db
          .prepare(
            "SELECT count(*) AS n FROM event_admin_otp_sessions o JOIN auth_sessions s ON s.id=o.session_id WHERE s.userId=?1",
          )
          .bind(user!.id)
          .first("n"),
      ).toBe(1);
    } finally {
      env.EVENT_ADMIN_EMAIL = previous;
    }
  });
  test("草稿创建与幂等重放、内容冲突及跨来源拒绝", async () => {
    const path = `/api/v1/integrations/${source}/events/event-001`;
    const body = { sourceVersion: 1, event: eventInput };
    const headers = {
      "if-none-match": "*",
      "idempotency-key": "create-event-001",
    };
    const first = await call(path, "PUT", body, headers);
    expect(first.response.status).toBe(201);
    const replay = await call(path, "PUT", body, headers);
    expect(replay.body.event?.id).toBe(first.body.event?.id);
    expect(replay.response.status).toBe(201);
    const conflict = await call(
      path,
      "PUT",
      { ...body, event: { ...eventInput, title: "另一个请求" } },
      headers,
    );
    expect(conflict.response.status).toBe(409);
    expect(
      (await call("/api/v1/integrations/another-source/events/event-001"))
        .response.status,
    ).toBe(403);
    const publish = await call(
      path,
      "PUT",
      { sourceVersion: 2, event: { ...eventInput, status: "published" } },
      { "if-match": '"v1"', "idempotency-key": "publish-event-001" },
    );
    expect(publish.response.status).toBe(403);
    const image = await handleEventMedia(
      request(`/media/events/${first.body.event!.id}/test-poster`),
      env,
    );
    expect(image?.status).toBe(404);
  });
  test("过期、撤销、恢复epoch失配均在幂等重放前拒绝", async () => {
    const path = `/api/v1/integrations/${source}/events/event-001`;
    await db
      .prepare(
        "UPDATE integration_api_keys SET revoked_at=?1 WHERE id='test-key'",
      )
      .bind(new Date().toISOString())
      .run();
    expect(
      (
        await call(
          path,
          "PUT",
          { sourceVersion: 1, event: eventInput },
          { "if-none-match": "*", "idempotency-key": "create-event-001" },
        )
      ).response.status,
    ).toBe(401);
    await db
      .prepare(
        "UPDATE integration_api_keys SET revoked_at=NULL,expires_at='2000-01-01T00:00:00Z' WHERE id='test-key'",
      )
      .run();
    expect((await call(path)).response.status).toBe(401);
    await db
      .prepare(
        "UPDATE integration_api_keys SET expires_at=?1 WHERE id='test-key'",
      )
      .bind(new Date(Date.now() + 86400_000).toISOString())
      .run();
    env.INTEGRATION_KEY_EPOCH = "restored-epoch";
    expect((await call(path)).response.status).toBe(401);
    env.INTEGRATION_KEY_EPOCH = "test-epoch";
  });
  test("指定ID范围不可创建或读写其他活动", async () => {
    await db
      .prepare(
        "UPDATE integration_api_keys SET scope_json=?1 WHERE id='test-key'",
      )
      .bind(
        JSON.stringify({
          type: "events",
          eventIds: ["cmi-talk-13-home-in-chiang-mai"],
        }),
      )
      .run();
    expect(
      (await call(`/api/v1/integrations/${source}/events/event-001`)).response
        .status,
    ).toBe(403);
    expect(
      (
        await call(
          `/api/v1/integrations/${source}/events/cmi-talk-13-home-in-chiang-mai`,
        )
      ).response.status,
    ).toBe(200);
    expect(
      (
        await call(
          `/api/v1/integrations/${source}/events/new-event`,
          "PUT",
          { sourceVersion: 1, event: eventInput },
          { "if-none-match": "*", "idempotency-key": "new-event-attempt" },
        )
      ).response.status,
    ).toBe(403);
    await db
      .prepare(
        "UPDATE integration_api_keys SET scope_json='{\"type\":\"source\"}' WHERE id='test-key'",
      )
      .run();
  });
  test("事务内重查撤销阻止鉴权与提交之间的越权", async () => {
    const key: IntegrationKey = {
      id: "test-key",
      userId: adminId,
      source,
      permissions: ["events:write"],
      scope: { type: "source" },
      epoch: "test-epoch",
      adminEmail: email,
      expiresAt: new Date(Date.now() + 86400_000).toISOString(),
    };
    const guard = integrationWriteGuard(key);
    await db
      .prepare(
        "UPDATE integration_api_keys SET revoked_at=?1 WHERE id='test-key'",
      )
      .bind(new Date().toISOString())
      .run();
    await expect(
      saveEvent(db, eventInput, {
        actor: {
          userId: adminId,
          actorType: "integration",
          source,
          keyId: key.id,
        },
        guard,
        createOnly: true,
        id: "revoked-race-event",
      }),
    ).rejects.toMatchObject({ code: "AUTHORIZATION_CHANGED" });
    expect(
      await db
        .prepare("SELECT id FROM content_entries WHERE id='revoked-race-event'")
        .first(),
    ).toBeNull();
    await db
      .prepare(
        "UPDATE integration_api_keys SET revoked_at=NULL,permissions_json=?1 WHERE id='test-key'",
      )
      .bind(
        JSON.stringify([
          "events:read",
          "events:write",
          "events:publish",
          "events:unpublish",
          "media:write",
        ]),
      )
      .run();
  });
  test("发布、过期ETag保护、下架同时撤去公开页面和图片并备份", async () => {
    const path = `/api/v1/integrations/${source}/events/event-001`;
    const publish = await call(
      path,
      "PUT",
      { sourceVersion: 2, event: { ...eventInput, status: "published" } },
      { "if-match": '"v1"', "idempotency-key": "publish-event-002" },
    );
    expect(publish.response.status).toBe(200);
    const id = publish.body.event!.id;
    expect((await call(`/api/v1/events/${id}`)).response.status).toBe(200);
    expect(
      (await handleEventMedia(request(`/media/events/${id}/test-poster`), env))
        ?.status,
    ).toBe(200);
    await db
      .prepare(
        "UPDATE integration_api_keys SET permissions_json=?1 WHERE id='test-key'",
      )
      .bind(JSON.stringify(["events:read", "events:write", "media:write"]))
      .run();
    const draftOnlyEdit = await call(
      path,
      "PUT",
      {
        sourceVersion: 3,
        event: {
          ...eventInput,
          title: "不能修改已公开内容",
          status: "published",
        },
      },
      { "if-match": '"v2"', "idempotency-key": "draft-only-edit-001" },
    );
    expect(draftOnlyEdit.response.status).toBe(403);
    await db
      .prepare(
        "UPDATE integration_api_keys SET permissions_json=?1 WHERE id='test-key'",
      )
      .bind(
        JSON.stringify([
          "events:read",
          "events:write",
          "events:publish",
          "events:unpublish",
          "media:write",
        ]),
      )
      .run();
    const implicitHide = await call(
      path,
      "PUT",
      { sourceVersion: 3, event: { ...eventInput, status: "draft" } },
      { "if-match": '"v2"', "idempotency-key": "implicit-hide-001" },
    );
    expect(implicitHide.response.status).toBe(409);
    expect(implicitHide.body.error?.code).toBe("UNPUBLISH_FIRST");
    expect((await call(`/api/v1/events/${id}`)).response.status).toBe(200);
    expect(
      await db
        .prepare(
          "SELECT count(*) AS n FROM event_unpublish_records WHERE event_id=?1",
        )
        .bind(id)
        .first("n"),
    ).toBe(0);
    expect(
      (
        await call(
          path,
          "PUT",
          {
            sourceVersion: 3,
            event: { ...eventInput, status: "published", title: "stale" },
          },
          { "if-match": '"v1"', "idempotency-key": "stale-event-001" },
        )
      ).response.status,
    ).toBe(412);
    const hidden = await call(
      path,
      "PATCH",
      { sourceVersion: 3, status: "unpublished" },
      { "if-match": '"v2"', "idempotency-key": "hide-event-001" },
    );
    expect(hidden.response.status).toBe(200);
    expect(hidden.body.event?.status).toBe("unpublished");
    expect((await call(`/api/v1/events/${id}`)).response.status).toBe(404);
    expect(
      (await handleEventMedia(request(`/media/events/${id}/test-poster`), env))
        ?.status,
    ).toBe(404);
    expect(
      await db
        .prepare("SELECT status FROM event_unpublish_records WHERE event_id=?1")
        .bind(id)
        .first("status"),
    ).toBe("complete");
    expect(
      (await env.EVENT_BACKUPS.list({ prefix: `unpublish/${id}/` })).objects
        .length,
    ).toBe(1);
  });
  test("私有海报上传幂等，非图片不写入媒体登记", async () => {
    const upload = async (
      file: Uint8Array,
      mime = "image/png",
      key = "upload-poster-001",
    ) => {
      const form = new FormData();
      form.append(
        "file",
        new File([file as Uint8Array<ArrayBuffer>], "poster.png", {
          type: mime,
        }),
      );
      return handleActivityApi(
        new Request(
          `http://localhost:5173/api/v1/integrations/${source}/media`,
          {
            method: "POST",
            headers: {
              authorization: `Bearer ${token}`,
              "idempotency-key": key,
            },
            body: form,
          },
        ),
        env,
        ctx,
      );
    };
    const first = await upload(png);
    expect(first?.status).toBe(201);
    const payload = (await first!.json()) as {
      media: { id: string; previewUrl: string };
    };
    uploadedMediaId = payload.media.id;
    expect(payload.media.previewUrl).toMatch(/^\/api\/v1\/admin\/media\//);
    const second = await upload(png);
    expect(((await second!.json()) as { media: { id: string } }).media.id).toBe(
      uploadedMediaId,
    );
    expect(
      (
        await upload(
          new TextEncoder().encode("<svg></svg>"),
          "image/png",
          "upload-invalid-001",
        )
      )?.status,
    ).toBe(422);
    expect(
      await db
        .prepare("SELECT count(*) FROM media_assets WHERE id=?1")
        .bind(uploadedMediaId)
        .first("count(*)"),
    ).toBe(1);
  });
  test("独立下架记录失败显示待重试，成功重放只补记录不增加版本", async () => {
    const path = `/api/v1/integrations/${source}/events/backup-retry`;
    const created = await call(
      path,
      "PUT",
      {
        sourceVersion: 1,
        event: {
          ...eventInput,
          posterMediaId: uploadedMediaId,
          status: "published",
        },
      },
      { "if-none-match": "*", "idempotency-key": "backup-create-001" },
    );
    expect(created.response.status).toBe(201);
    const bucket = env.EVENT_BACKUPS;
    env.EVENT_BACKUPS = undefined as unknown as R2Bucket;
    const body = { sourceVersion: 2, status: "unpublished" };
    const headers = {
      "if-match": '"v1"',
      "idempotency-key": "backup-hide-001",
    };
    const pending = await call(path, "PATCH", body, headers);
    expect(pending.response.status).toBe(503);
    expect(pending.body.error?.code).toBe("BACKUP_PENDING");
    expect(
      (
        await handleEventMedia(
          request(`/media/events/${created.body.event!.id}/${uploadedMediaId}`),
          env,
        )
      )?.status,
    ).toBe(404);
    const republish = await call(
      path,
      "PUT",
      {
        sourceVersion: 3,
        event: {
          ...eventInput,
          posterMediaId: uploadedMediaId,
          status: "published",
        },
      },
      { "if-match": '"v2"', "idempotency-key": "pending-republish-001" },
    );
    expect(republish.response.status).toBe(409);
    expect(republish.body.error?.code).toBe("UNPUBLISH_BACKUP_PENDING");
    env.EVENT_BACKUPS = bucket;
    const retry = await call(path, "PATCH", body, headers);
    expect(retry.response.status).toBe(200);
    expect(retry.body.event?.version).toBe(2);
    expect(
      await db
        .prepare(
          "SELECT count(*) AS n FROM content_revisions WHERE content_id=?1",
        )
        .bind(created.body.event!.id)
        .first("n"),
    ).toBe(2);
  });
  test("修订恢复保留旧版本并生成新草稿", async () => {
    const row = await db
      .prepare(
        "SELECT event_id FROM event_external_links WHERE source=?1 AND external_id='event-001'",
      )
      .bind(source)
      .first<{ event_id: string }>();
    const result = await call(
      `/api/v1/admin/events/${row!.event_id}/restore`,
      "POST",
      { revisionNumber: 2 },
      {
        cookie: adminCookie,
        origin: "http://localhost:5173",
        "if-match": '"v3"',
      },
    );
    expect(result.response.status).toBe(200);
    expect(result.body.event).toMatchObject({ version: 4, status: "draft" });
    expect(
      await db
        .prepare(
          "SELECT count(*) AS n FROM content_revisions WHERE content_id=?1",
        )
        .bind(row!.event_id)
        .first("n"),
    ).toBe(4);
    const log = await db
      .prepare(
        "SELECT metadata_json FROM audit_logs WHERE action='event.restored' AND resource_id=?1",
      )
      .bind(row!.event_id)
      .first<{ metadata_json: string }>();
    expect(JSON.parse(log!.metadata_json).restoredFromVersion).toBe(2);
  });
  test("通用内容/媒体接口不能读取、创建、转换、发布或覆盖受管活动", async () => {
    const row = await db
      .prepare(
        "SELECT event_id FROM event_external_links WHERE source=?1 AND external_id='event-001'",
      )
      .bind(source)
      .first<{ event_id: string }>();
    const headers = { cookie: adminCookie, origin: "http://localhost:5173" };
    const generic = (path: string, method = "GET", body?: unknown) =>
      handleV1Api(request(path, method, body, headers), env, ctx);
    expect((await generic(`/api/v1/content/${row!.event_id}`)).status).toBe(
      404,
    );
    expect(
      (
        await generic("/api/v1/content", "POST", {
          type: "event",
          slug: "event-bypass",
          title: "不能绕过",
        })
      ).status,
    ).toBe(403);
    expect(
      (
        await generic(`/api/v1/content/${row!.event_id}`, "PATCH", {
          type: "story",
        })
      ).status,
    ).toBe(403);
    expect(
      (await generic(`/api/v1/content/${row!.event_id}/publish`, "POST", {}))
        .status,
    ).toBe(403);
    expect(
      (await generic(`/api/v1/media/${uploadedMediaId}/content`, "PUT", {}))
        .status,
    ).toBe(403);
    const story = await generic("/api/v1/content", "POST", {
      type: "story",
      slug: "ordinary-test-story",
      title: "普通故事",
    });
    expect(story.status).toBe(201);
    const storyId = ((await story.json()) as { content: { id: string } })
      .content.id;
    expect(
      (await generic(`/api/v1/content/${storyId}`, "PATCH", { type: "event" }))
        .status,
    ).toBe(403);
    const collection = await generic("/api/v1/content?status=draft");
    expect(
      (
        (await collection.json()) as { content: { type: string }[] }
      ).content.every((item) => item.type !== "event"),
    ).toBe(true);
  });
  test("管理员接口拒绝跨站写入、Bearer替代会话及没有OTP证明的会话", async () => {
    expect(
      (
        await call(
          "/api/v1/admin/api-keys",
          "POST",
          { name: "Cross site", source: "cross-site" },
          { cookie: adminCookie, origin: "https://example.com" },
        )
      ).response.status,
    ).toBe(403);
    expect((await call("/api/v1/admin/events")).response.status).toBe(401);
    const proof = await db
      .prepare(
        "SELECT o.session_id,o.verified_at FROM event_admin_otp_sessions o JOIN auth_sessions s ON s.id=o.session_id WHERE s.userId=?1 LIMIT 1",
      )
      .bind(adminId)
      .first<{ session_id: string; verified_at: string }>();
    await db
      .prepare("DELETE FROM event_admin_otp_sessions WHERE session_id=?1")
      .bind(proof!.session_id)
      .run();
    const rejected = await call("/api/v1/admin/events", "GET", undefined, {
      cookie: adminCookie,
    });
    expect(rejected.response.status).toBe(403);
    expect(rejected.body.error?.code).toBe("OTP_REQUIRED");
    await db
      .prepare(
        "INSERT INTO event_admin_otp_sessions(session_id,verified_at) VALUES(?1,?2)",
      )
      .bind(proof!.session_id, proof!.verified_at)
      .run();
  });
  test("上传期间密钥到期，事务拒绝媒体登记并保留私有孤儿审计", async () => {
    const bucket = env.EVENT_MEDIA;
    const count = await db
      .prepare("SELECT count(*) AS n FROM media_assets")
      .first("n");
    env.EVENT_MEDIA = new Proxy(bucket, {
      get(target, property) {
        if (property === "put")
          return async (...args: Parameters<R2Bucket["put"]>) => {
            const object = await target.put(...args);
            await db
              .prepare(
                "UPDATE integration_api_keys SET expires_at='2000-01-01T00:00:00Z' WHERE id='test-key'",
              )
              .run();
            return object;
          };
        return Reflect.get(target, property);
      },
    });
    const form = new FormData();
    form.append("file", new File([png], "poster.png", { type: "image/png" }));
    const result = await handleActivityApi(
      new Request(`http://localhost:5173/api/v1/integrations/${source}/media`, {
        method: "POST",
        headers: {
          authorization: `Bearer ${token}`,
          "idempotency-key": "expired-upload-001",
        },
        body: form,
      }),
      env,
      ctx,
    );
    expect(result?.status).toBe(403);
    expect(
      await db.prepare("SELECT count(*) AS n FROM media_assets").first("n"),
    ).toBe(count);
    expect(
      await db
        .prepare(
          "SELECT count(*) AS n FROM audit_logs WHERE action='event.media.private_orphan'",
        )
        .first("n"),
    ).toBe(1);
    env.EVENT_MEDIA = bucket;
  });
});
