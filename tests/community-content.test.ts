import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { createHash } from "node:crypto";
import { Miniflare } from "miniflare";
import { createAuth } from "../workers/auth";
import { requireEventAdmin } from "../workers/integration-auth";
import {
  handleCommunityContentApi,
  handleCommunityMedia,
} from "../workers/community-content";
import { publicPhotoAsset } from "../workers/photo-media";
import {
  loadMuseumPhotoCatalog,
  listPhotos,
} from "../app/modules/community-content/content-repository.server";
import { saveSeries } from "../app/modules/community-content/content-service.server";
import { listArchiveEvents } from "../app/modules/community-content/archive-repository.server";
import { loadPublicPosterCatalog } from "../app/modules/activities/event-public";
import type {
  CommunityPhoto,
  CommunitySeries,
} from "../app/modules/community-content/content-schema";

describe("社区内容管理（真实隔离 D1/R2）", () => {
  let mf: Miniflare,
    env: CloudflareEnv,
    db: D1Database,
    cookie = "";
  let series: CommunitySeries, photo: CommunityPhoto;
  const ctx = {
    waitUntil: () => {},
    passThroughOnException: () => {},
  } as unknown as ExecutionContext;
  const email = "community-admin@example.com";
  function req(
    path: string,
    method = "GET",
    body?: unknown,
    headers: Record<string, string> = {},
  ) {
    return new Request(`http://localhost:5173${path}`, {
      method,
      headers: {
        cookie,
        origin: "http://localhost:5173",
        "content-type": "application/json",
        ...headers,
      },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
  }
  async function api(
    path: string,
    method = "GET",
    body?: unknown,
    headers: Record<string, string> = {},
  ) {
    const response = (await handleCommunityContentApi(
      req(`/api/v1/admin${path}`, method, body, headers),
      env,
      ctx,
    ))!;
    return {
      response,
      body: (await response.json()) as {
        series: CommunitySeries;
        photo: CommunityPhoto;
        imported: number;
        total: number;
        membership: {
          eventId: string;
          seriesId: string | null;
          version: number;
        };
        event: { version: number; status: string; eventTime: string };
        error: { code: string };
      },
    };
  }
  beforeAll(async () => {
    mf = new Miniflare({
      modules: true,
      script: "export default {fetch(){return new Response('ok')}}",
      compatibilityDate: "2026-08-01",
      d1Databases: ["DB"],
      r2Buckets: ["MEDIA", "EVENT_MEDIA"],
    });
    db = (await mf.getD1Database("DB")) as unknown as D1Database;
    for (const file of readdirSync("migrations")
      .filter((name) => name.endsWith(".sql"))
      .sort()) {
      for (const statement of readFileSync(`migrations/${file}`, "utf8")
        .replace(/^--.*$/gm, "")
        .split(/;\s*(?:\n|$)/)
        .filter((value) => value.trim()))
        await db.prepare(statement).run();
    }
    env = {
      DB: db,
      MEDIA: await mf.getR2Bucket("MEDIA"),
      EVENT_MEDIA: await mf.getR2Bucket("EVENT_MEDIA"),
      APP_ENV: "development",
      BETTER_AUTH_URL: "http://localhost:5173",
      BETTER_AUTH_SECRET: "local-test-secret-at-least-32-characters",
      EVENT_ADMIN_EMAIL: email,
    } as unknown as CloudflareEnv;
    const otp = "381762",
      now = new Date().toISOString();
    await db
      .prepare(
        "INSERT INTO auth_verifications(id,identifier,value,expiresAt,createdAt,updatedAt) VALUES(?,?,?,?,?,?)",
      )
      .bind(
        crypto.randomUUID(),
        `sign-in-otp-${email}`,
        `${createHash("sha256").update(otp).digest("base64url")}:0`,
        new Date(Date.now() + 300_000).toISOString(),
        now,
        now,
      )
      .run();
    const signed = await createAuth(env, ctx).handler(
      req("/api/auth/sign-in/email-otp", "POST", {
        email,
        otp,
        name: "Synthetic administrator",
      }),
    );
    expect(signed.status).toBe(200);
    cookie = signed.headers
      .getSetCookie()
      .map((value) => value.split(";")[0])
      .join("; ");
    const user = await db
      .prepare("SELECT id FROM auth_users WHERE email=?")
      .bind(email)
      .first<{ id: string }>();
    await db
      .prepare(
        "INSERT INTO media_assets(id,object_key,mime_type,byte_size,status,created_by,rights_status) VALUES('community-image','events/community-test.png','image/png',4,'ready',?,'cleared')",
      )
      .bind(user!.id)
      .run();
    await db
      .prepare(
        "INSERT INTO event_media(media_id,width,height,storage,verified_at) VALUES('community-image',1200,800,'private',?)",
      )
      .bind(now)
      .run();
    await env.EVENT_MEDIA.put(
      "events/community-test.png",
      new Uint8Array([1, 2, 3, 4]),
    );
    await env.MEDIA.put(
      "photo-museum/v2/catalog.json",
      JSON.stringify({
        version: "photo-museum/v2",
        count: 2,
        photos: [1, 2].map((n) => ({
          id: `legacy-photo-00${n}`,
          thumbnailPath: `thumbs/legacy-photo-00${n}.webp`,
          fullPath: `full/legacy-photo-00${n}.webp`,
          width: 1200,
          height: 800,
          alt: `旧照片${n}`,
          displayOrder: n,
        })),
      }),
    );
    await env.MEDIA.put(
      "poster-wall/v1/catalog.json",
      JSON.stringify({
        posters: [
          {
            id: "legacy-event.png",
            imagePath: "legacy-event.webp",
            width: 1024,
            height: 1536,
            title: "旧活动",
            publishedAt: "2024-01-01",
            publishedDate: "2024-01-01",
            eventTime: "原始时间未精确到小时",
            initiator: "CMI",
            summary: "原简介",
            articleUrl: "https://example.com/legacy",
            privateObjectKey: "private/never-public.webp",
            sourceLocalPath: "/private/never-public.png",
            series: {
              name: "旧系列",
              issue: null,
              internalNote: "private-note",
            },
            category: "旧分类",
          },
          {
            id: "activity-cmi-natural-food-club-01-friday-kitchen.webp",
            title: "已迁活动副本",
            articleUrl: "https://example.com/duplicate",
          },
        ],
      }),
    );
  }, 60_000);
  afterAll(async () => {
    await mf?.dispose();
  });

  test("照片、栏目、历史活动和归属API均拒绝匿名及跨来源修改", async () => {
    for (const path of [
      "/photos",
      "/series",
      "/archive-events",
      "/event-series",
    ])
      expect(
        (await api(path, "GET", undefined, { cookie: "" })).response.status,
      ).toBe(401);
    expect(
      (
        await api(
          "/series",
          "POST",
          { slug: "cross", name: "不应创建" },
          { origin: "https://example.com" },
        )
      ).body.error.code,
    ).toBe("ORIGIN_REQUIRED");
    expect(
      await db.prepare("SELECT count(*) n FROM community_series").first("n"),
    ).toBe(0);
  });
  test("栏目与照片发布、草稿隔离、版本冲突和下架在公共媒体层生效", async () => {
    const created = await api("/series", "POST", {
      slug: "talk",
      name: "社区分享",
      logoMediaId: "community-image",
    });
    expect(created.response.status).toBe(201);
    series = created.body.series;
    expect(
      (await handleCommunityMedia(req(series.logoUrl!), env))!.status,
    ).toBe(404);
    const createdPhoto = await api("/photos", "POST", {
      mediaId: "community-image",
      alt: "合成照片",
      status: "draft",
      seriesId: series.id,
    });
    expect(createdPhoto.response.status).toBe(201);
    photo = createdPhoto.body.photo;
    expect(await listPhotos(db, true)).toHaveLength(0);
    expect((await handleCommunityMedia(req(photo.url), env))!.status).toBe(404);
    const publicPhoto = await api(
      `/photos/${photo.id}`,
      "PATCH",
      { status: "published" },
      { "if-match": '"v1"' },
    );
    expect(publicPhoto.response.status).toBe(200);
    photo = publicPhoto.body.photo;
    // Hiding a series affects its page/logo, not independently published photos.
    expect(await listPhotos(db, true)).toHaveLength(1);
    const published = await api(
      `/series/${series.id}`,
      "PATCH",
      { status: "published" },
      { "if-match": '"v1"' },
    );
    expect(published.response.status).toBe(200);
    series = published.body.series;
    expect(await listPhotos(db, true)).toHaveLength(1);
    const media = (await handleCommunityMedia(req(photo.url), env))!;
    expect(media.status).toBe(200);
    expect(media.headers.get("cache-control")).toBe("no-store");
    expect(
      (await handleCommunityMedia(req(series.logoUrl!), env))!.status,
    ).toBe(200);
    expect(
      (
        await api(
          `/series/${series.id}`,
          "PATCH",
          { name: "覆盖失败" },
          { "if-match": '"v1"' },
        )
      ).response.status,
    ).toBe(409);
    expect(
      (await api(`/photos/${photo.id}`, "PATCH", { status: "unpublished" }))
        .response.status,
    ).toBe(428);
    const hidden = await api(
      `/photos/${photo.id}`,
      "PATCH",
      { status: "unpublished" },
      { "if-match": '"v2"' },
    );
    expect(hidden.response.status).toBe(200);
    photo = hidden.body.photo;
    expect((await handleCommunityMedia(req(photo.url), env))!.status).toBe(404);
    expect(
      (
        await api(
          `/photos/${photo.id}`,
          "PATCH",
          { alt: "旧版本写入" },
          { "if-match": '"v1"' },
        )
      ).response.status,
    ).toBe(409);
  });
  test("照片导入不复制R2、可重复运行且不复活下架或覆盖编辑", async () => {
    expect((await loadMuseumPhotoCatalog(env)).map((p) => p.id)).toEqual([
      "legacy-photo-001",
      "legacy-photo-002",
    ]);
    const first = await api("/photos/import-legacy", "POST", {});
    expect(first.body).toMatchObject({ imported: 2, total: 2 });
    expect(
      (
        await api(
          "/photos/legacy-photo-001",
          "PATCH",
          { status: "unpublished", alt: "管理员已修改" },
          { "if-match": '"v1"' },
        )
      ).response.status,
    ).toBe(200);
    // Simulate an interrupted batched import before the completion marker.
    await db
      .prepare("DELETE FROM community_imports WHERE id='photo-museum/v2'")
      .run();
    expect((await loadMuseumPhotoCatalog(env)).map((p) => p.id)).toEqual([
      "legacy-photo-002",
    ]);
    expect((await api("/photos/import-legacy", "POST", {})).body.imported).toBe(
      0,
    );
    const listing = await listPhotos(db);
    expect(listing.find((p) => p.id === "legacy-photo-001")).toMatchObject({
      alt: "管理员已修改",
      status: "unpublished",
      version: 2,
    });
    expect((await loadMuseumPhotoCatalog(env)).map((p) => p.id)).toEqual([
      "legacy-photo-002",
    ]);
    await api(
      "/photos/legacy-photo-002",
      "PATCH",
      { status: "unpublished" },
      { "if-match": '"v1"' },
    );
    expect(await loadMuseumPhotoCatalog(env)).toHaveLength(0);
    expect((await env.MEDIA.list()).objects).toHaveLength(2);
  });
  test("下架照片保留管理员预览，匿名不能访问管理原图", async () => {
    await env.MEDIA.put(
      "photo-museum/v2/thumbs/legacy-photo-001.webp",
      new Uint8Array([5, 6]),
    );
    await env.MEDIA.put(
      "photo-museum/v2/full/legacy-photo-001.webp",
      new Uint8Array([5, 6, 7]),
    );
    for (const id of [photo.id, "legacy-photo-001"]) {
      const path = `/api/v1/admin/photos/${id}/preview`;
      const response = (await handleCommunityContentApi(req(path), env, ctx))!;
      expect(response.status).toBe(200);
      expect(response.headers.get("cache-control")).toBe("no-store");
      expect(
        (await handleCommunityContentApi(
          req(path, "GET", undefined, { cookie: "" }),
          env,
          ctx,
        ))!.status,
      ).toBe(401);
      expect(
        (await handleCommunityContentApi(
          req(path.replace("/preview", "/image")),
          env,
          ctx,
        ))!.status,
      ).toBe(200);
    }
    expect((await handleCommunityMedia(req(photo.url), env))!.status).toBe(404);
    expect(await listPhotos(db, true)).toHaveLength(0);
  });
  test("历史照片换受管公开URL，旧同域路径也遵守发布状态且不新增长期缓存", async () => {
    const published = await api(
      "/photos/legacy-photo-001",
      "PATCH",
      { status: "published" },
      { "if-match": '"v2"' },
    );
    expect(published.response.status).toBe(200);
    const legacy = published.body.photo;
    expect(legacy.url).toBe("/media/community/photos/legacy-photo-001");
    expect(legacy.thumbnailUrl).toBe(`${legacy.url}?thumbnail=1`);
    const full = (await handleCommunityMedia(req(legacy.url), env))!;
    expect(full.status).toBe(200);
    expect(full.headers.get("cache-control")).toBe("no-store");
    expect((await full.arrayBuffer()).byteLength).toBe(3);
    const thumb = (await handleCommunityMedia(req(legacy.thumbnailUrl), env))!;
    expect(thumb.status).toBe(200);
    expect((await thumb.arrayBuffer()).byteLength).toBe(2);
    const oldFull = "/media/photo-museum/v2/full/legacy-photo-001.webp";
    const oldThumb = "/media/photo-museum/v2/thumbs/legacy-photo-001.webp";
    for (const path of [oldFull, oldThumb]) {
      const response = (await publicPhotoAsset(req(path), env))!;
      expect(response.status).toBe(200);
      expect(response.headers.get("cache-control")).toBe("no-store");
    }
    await api(
      "/photos/legacy-photo-001",
      "PATCH",
      { status: "unpublished" },
      { "if-match": '"v3"' },
    );
    for (const path of [legacy.url, legacy.thumbnailUrl])
      expect((await handleCommunityMedia(req(path), env))!.status).toBe(404);
    for (const path of [oldFull, oldThumb]) {
      const response = (await publicPhotoAsset(req(path), env))!;
      expect(response.status).toBe(404);
      expect(response.headers.get("cache-control")).toBe("no-store");
    }
    // An original URL absent from the management index still works before import.
    await env.MEDIA.put(
      "photo-museum/v2/full/not-indexed.webp",
      new Uint8Array([8]),
    );
    const original = (await publicPhotoAsset(
      req("/media/photo-museum/v2/full/not-indexed.webp"),
      env,
    ))!;
    expect(original.status).toBe(200);
    expect(original.headers.get("cache-control")).toBe("no-store");
  });
  test("活动栏目独立乐观版本，不改现有活动版本或集成合同", async () => {
    const eventId = "cmi-natural-food-club-01-friday-kitchen";
    const before = await db
      .prepare("SELECT version FROM event_details WHERE content_id=?")
      .bind(eventId)
      .first("version");
    const assigned = await api(
      `/event-series/${eventId}`,
      "PATCH",
      { seriesId: series.id },
      { "if-match": '"v0"' },
    );
    expect(assigned.body.membership).toMatchObject({
      eventId,
      seriesId: series.id,
      version: 1,
    });
    expect(
      (
        await api(
          `/event-series/${eventId}`,
          "PATCH",
          { seriesId: null },
          { "if-match": '"v0"' },
        )
      ).response.status,
    ).toBe(409);
    expect(
      await db
        .prepare("SELECT version FROM event_details WHERE content_id=?")
        .bind(eventId)
        .first("version"),
    ).toBe(before);
  });
  test("历史活动覆盖保留原时间精度，公开去重并遵守下架状态", async () => {
    expect((await listArchiveEvents(env)).map((e) => e.id)).toEqual([
      "legacy-event.png",
    ]);
    expect(JSON.stringify(await listArchiveEvents(env, true))).not.toMatch(
      /privateObjectKey|sourceLocalPath|internalNote|never-public|private-note/,
    );
    const saved = await api(
      "/archive-events/legacy-event.png",
      "PATCH",
      { title: "编辑后的旧活动", seriesId: series.id },
      { "if-match": '"v0"' },
    );
    expect(saved.body.event).toMatchObject({
      version: 1,
      eventTime: "原始时间未精确到小时",
    });
    expect((await listArchiveEvents(env, true))[0]).toMatchObject({
      title: "编辑后的旧活动",
      seriesId: series.id,
    });
    expect(
      (
        await api(
          "/archive-events/legacy-event.png",
          "PATCH",
          { status: "unpublished" },
          { "if-match": '"v0"' },
        )
      ).response.status,
    ).toBe(409);
    expect(
      (
        await api(
          "/archive-events/legacy-event.png",
          "PATCH",
          { status: "unpublished" },
          { "if-match": '"v1"' },
        )
      ).response.status,
    ).toBe(200);
    expect(await listArchiveEvents(env, true)).toHaveLength(0);
    expect((await loadPublicPosterCatalog(env)).posters).toHaveLength(0);
  });
  test("已撤销管理员的陈旧actor无法在D1事务中写入", async () => {
    const actor = await requireEventAdmin(
      req("/api/v1/admin/series"),
      env,
      ctx,
    );
    await db
      .prepare("DELETE FROM user_roles WHERE user_id=? AND role='admin'")
      .bind(actor.userId)
      .run();
    await expect(
      saveSeries(db, actor, { slug: "revoked", name: "禁止写入" }),
    ).rejects.toMatchObject({ code: "ADMIN_SESSION_CHANGED" });
    expect(
      await db
        .prepare("SELECT count(*) n FROM community_series WHERE slug='revoked'")
        .first("n"),
    ).toBe(0);
    expect(
      await db
        .prepare("SELECT count(*) n FROM community_write_assertions")
        .first("n"),
    ).toBe(0);
  });
});
