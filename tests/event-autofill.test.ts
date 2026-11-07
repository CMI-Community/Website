import {
  beforeAll,
  afterAll,
  beforeEach,
  afterEach,
  describe,
  expect,
  test,
  vi,
} from "vitest";
import { Miniflare } from "miniflare";
import { readFileSync, readdirSync } from "node:fs";
import { createHmac } from "node:crypto";
import {
  autofillFieldsSchema,
  mergeAutofill,
} from "../app/modules/activities/event-autofill";
import type { EventInput } from "../app/modules/activities/event-schema";
import { handleActivityApi } from "../workers/activity-api";
import { sha256 } from "../workers/integration-auth";

const fields = {
  title: "一起认识清迈",
  startsAt: "2026-11-20T14:00:00+07:00",
  endsAt: "2026-11-20T16:00:00+07:00",
  location: "合成测试空间",
  category: "分享交流",
  summary: "认识彼此与清迈的分享交流。",
  posterAlt: "合成活动海报",
  detailUrl: null,
  registrationUrl: null,
  initiator: "合成组织",
  series: null,
  sourcePublishedAt: null,
};
const current: EventInput = {
  title: "我手动修改的标题",
  startsAt: null,
  endsAt: null,
  location: "",
  category: "",
  summary: "",
  posterMediaId: "poster",
  posterAlt: null,
  detailUrl: null,
  registrationUrl: null,
  initiator: "CMI Community",
  series: null,
  sourcePublishedAt: null,
  status: "published",
};
test("默认保留人工内容，补空白；显式覆盖也不改变发布状态、媒体或清除未知字段", () => {
  const merged = mergeAutofill(current, fields, false);
  expect(merged.form.title).toBe(current.title);
  expect(merged.form.startsAt).toBe(fields.startsAt);
  expect(merged.form.initiator).toBe(fields.initiator);
  expect(merged.form.status).toBe("published");
  expect(merged.form.posterMediaId).toBe("poster");
  expect(
    mergeAutofill(current, { ...fields, title: null }, true).form.title,
  ).toBe(current.title);
  expect(mergeAutofill(current, fields, true).form.title).toBe(fields.title);
});
test("自动填写不能改变确认的补录日期或移除补录说明", () => {
  const merged = mergeAutofill(
    { ...current, summary: "旧简介。该时间为后期补录" },
    fields,
    true,
    true,
  );
  expect(merged.form.startsAt).toBeNull();
  expect(merged.form.endsAt).toBeNull();
  expect(merged.form.summary).toContain("该时间为后期补录");
  expect(merged.preserved).toEqual(
    expect.arrayContaining(["startsAt", "endsAt"]),
  );
});
test("模型返回不能携带状态、非法链接或无效日期", () => {
  expect(
    autofillFieldsSchema.safeParse({ ...fields, status: "published" }).success,
  ).toBe(false);
  expect(
    autofillFieldsSchema.safeParse({
      ...fields,
      registrationUrl: "javascript:alert(1)",
    }).success,
  ).toBe(false);
  expect(
    autofillFieldsSchema.safeParse({
      ...fields,
      startsAt: "2026-02-30T14:00:00+07:00",
    }).success,
  ).toBe(false);
});

describe("自动填写接口，真实隔离 D1/R2，模型响应完全模拟", () => {
  let mf: Miniflare, db: D1Database, env: CloudflareEnv;
  const ctx = {
    waitUntil() {},
    passThroughOnException() {},
  } as unknown as ExecutionContext;
  const secret = "synthetic-autofill-test-at-least-32-characters";
  const token = "synthetic-autofill-session";
  const cookie = `better-auth.session_token=${encodeURIComponent(`${token}.${createHmac("sha256", secret).update(token).digest("base64")}`)}`;
  const png = Uint8Array.from(
    Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aNncAAAAASUVORK5CYII=",
      "base64",
    ),
  );
  const now = new Date().toISOString();
  beforeAll(async () => {
    mf = new Miniflare({
      modules: true,
      script: "export default {fetch(){return new Response('isolated')}}",
      compatibilityDate: "2026-08-01",
      d1Databases: ["DB"],
      r2Buckets: ["EVENT_MEDIA"],
    });
    db = (await mf.getD1Database("DB")) as unknown as D1Database;
    for (const file of readdirSync("migrations")
      .filter((n) => n.endsWith(".sql"))
      .sort()) {
      for (const sql of readFileSync(`migrations/${file}`, "utf8")
        .replace(/^--.*$/gm, "")
        .split(/;\s*(?:\n|$)/)
        .filter((s) => s.trim()))
        await db.prepare(sql).run();
    }
    await db
      .prepare(
        "INSERT INTO auth_users(id,name,email,emailVerified,createdAt,updatedAt) VALUES('auto-admin','Synthetic admin','autofill@example.com',1,?1,?1)",
      )
      .bind(now)
      .run();
    await db
      .prepare(
        "INSERT INTO user_roles(user_id,role) VALUES('auto-admin','admin')",
      )
      .run();
    await db
      .prepare(
        "INSERT INTO auth_sessions(id,userId,token,expiresAt,createdAt,updatedAt) VALUES('auto-session','auto-admin',?1,?2,?3,?3)",
      )
      .bind(token, new Date(Date.now() + 3600_000).toISOString(), now)
      .run();
    await db
      .prepare(
        "INSERT INTO event_admin_otp_sessions(session_id,verified_at) VALUES('auto-session',?1)",
      )
      .bind(now)
      .run();
    await db
      .prepare(
        "INSERT INTO media_assets(id,object_key,mime_type,byte_size,status,created_by,checksum_sha256) VALUES('auto-poster','events/autofill/test.png','image/png',?1,'ready','auto-admin',?2)",
      )
      .bind(png.length, await sha256(png.buffer))
      .run();
    await db
      .prepare(
        "INSERT INTO event_media(media_id,width,height,storage,verified_at) VALUES('auto-poster',1,1,'private',?1)",
      )
      .bind(now)
      .run();
    env = {
      DB: db,
      APP_ENV: "development",
      EVENT_ADMIN_EMAIL: "autofill@example.com",
      BETTER_AUTH_URL: "http://localhost:5173",
      BETTER_AUTH_SECRET: secret,
      EVENT_MEDIA: await mf.getR2Bucket("EVENT_MEDIA"),
    } as unknown as CloudflareEnv;
    await env.EVENT_MEDIA.put("events/autofill/test.png", png);
  }, 60_000);
  beforeEach(async () => {
    env.OPENAI_API_KEY = "synthetic-not-a-real-key";
    await db.prepare("DELETE FROM auth_rate_limits").run();
  });
  afterEach(() => vi.unstubAllGlobals());
  afterAll(async () => {
    await mf?.dispose();
  });
  async function call(
    method = "POST",
    body: unknown = {
      body: "已编辑活动正文：2026年11月20日14至16点，合成测试空间。",
      posterMediaId: "auto-poster",
    },
    overrides: Record<string, string> = {},
  ) {
    return (await handleActivityApi(
      new Request("http://localhost:5173/api/v1/admin/events/autofill", {
        method,
        headers: {
          cookie,
          origin: "http://localhost:5173",
          "content-type": "application/json",
          ...overrides,
        },
        ...(method === "POST" ? { body: JSON.stringify(body) } : {}),
      }),
      env,
      ctx,
    ))!;
  }
  const reply = (
    value: unknown = { fields, warnings: [] },
    status = "completed",
  ) =>
    new Response(
      JSON.stringify({
        status,
        output: [
          {
            type: "message",
            content: [{ type: "output_text", text: JSON.stringify(value) }],
          },
        ],
      }),
      { headers: { "content-type": "application/json" } },
    );
  test("匿名、跨站与缺少配置时拒绝，且不调用模型", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    expect((await call("POST", undefined, { cookie: "" })).status).toBe(401);
    expect(
      (await call("POST", undefined, { origin: "https://example.com" })).status,
    ).toBe(403);
    delete env.OPENAI_API_KEY;
    expect(await (await call("GET")).json()).toMatchObject({
      configured: false,
      provider: "OpenAI",
    });
    expect((await call()).status).toBe(503);
    expect(fetchMock).not.toHaveBeenCalled();
  });
  test("私有图与正文一起传模型，结果只返回建议、不写活动或修订", async () => {
    const count = await db
      .prepare("SELECT count(*) n FROM content_revisions")
      .first("n");
    const fetchMock = vi.fn().mockResolvedValue(reply());
    vi.stubGlobal("fetch", fetchMock);
    const result = await call();
    expect(result.status).toBe(200);
    expect(await result.json()).toMatchObject({ fields, missingFields: [] });
    expect(fetchMock.mock.calls[0][0]).toBe(
      "https://api.openai.com/v1/responses",
    );
    const request = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(request.input[0].content[0]).toMatchObject({
      type: "input_image",
      image_url: expect.stringContaining("data:image/png;base64,"),
      detail: "high",
    });
    expect(request.input[0].content[1].text).toContain("已编辑活动正文");
    expect(request.text.format.type).toBe("json_schema");
    expect(request.text.format.strict).toBe(true);
    expect(request.store).toBe(false);
    expect(request.model).toBe("gpt-5.4-mini");
    expect(request.instructions).toContain("正文优先于海报");
    expect(
      await db.prepare("SELECT count(*) n FROM content_revisions").first("n"),
    ).toBe(count);
  });
  test("缺少结束时间保持空白，错误时序也留空并提示", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation(() =>
        reply({
          fields: { ...fields, endsAt: "2026-11-20T12:00:00+07:00" },
          warnings: [],
        }),
      ),
    );
    const payload = (await (await call()).json()) as {
      fields: { endsAt: string | null };
      missingFields: string[];
      warnings: string[];
    };
    expect(payload.fields.endsAt).toBeNull();
    expect(payload.missingFields).toContain("endsAt");
    expect(payload.warnings).toHaveLength(1);
  });
  test("个别字段不合规时保留有效识别结果，只对问题字段留空", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation(() =>
        reply({
          fields: {
            ...fields,
            registrationUrl: "见海报二维码",
            posterAlt: "",
            series: { name: "", issue: null },
          },
          warnings: [""],
        }),
      ),
    );
    const result = await call();
    expect(result.status).toBe(200);
    expect(await result.json()).toMatchObject({
      fields: {
        title: fields.title,
        startsAt: fields.startsAt,
        registrationUrl: null,
        posterAlt: null,
        series: null,
      },
      warnings: [expect.stringContaining("报名链接、系列及期数")],
    });
  });
  test("未知媒体、超长正文与模型越界字段不进入表单", async () => {
    const fetchMock = vi
      .fn()
      .mockImplementation(() =>
        reply({ fields: { ...fields, status: "published" }, warnings: [] }),
      );
    vi.stubGlobal("fetch", fetchMock);
    expect(
      (await call("POST", { body: "活动正文", posterMediaId: "not-there" }))
        .status,
    ).toBe(422);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(
      (await call("POST", { body: "文".repeat(20001), posterMediaId: null }))
        .status,
    ).toBe(422);
    expect((await call()).status).toBe(502);
  });
  test("损坏的私有海报不出站", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    await env.EVENT_MEDIA.put(
      "events/autofill/test.png",
      new Uint8Array(png.length),
    );
    try {
      expect((await call()).status).toBe(422);
      expect(fetchMock).not.toHaveBeenCalled();
    } finally {
      await env.EVENT_MEDIA.put("events/autofill/test.png", png);
    }
  });
  test("超限媒体不出站，原海报记录仍保留", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    await db
      .prepare(
        "UPDATE media_assets SET byte_size=11534336 WHERE id='auto-poster'",
      )
      .run();
    try {
      expect((await call()).status).toBe(422);
      expect(fetchMock).not.toHaveBeenCalled();
      expect(
        await db
          .prepare("SELECT byte_size FROM media_assets WHERE id='auto-poster'")
          .first("byte_size"),
      ).toBe(11534336);
    } finally {
      await db
        .prepare("UPDATE media_assets SET byte_size=?1 WHERE id='auto-poster'")
        .bind(png.length)
        .run();
    }
  });
  test("API额度不足、模型拒绝及错误模型配置不会返回半成品", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValueOnce(
          new Response(
            JSON.stringify({ error: { code: "insufficient_quota" } }),
            { status: 429 },
          ),
        )
        .mockResolvedValueOnce(
          new Response(
            JSON.stringify({
              status: "completed",
              output: [
                {
                  type: "message",
                  content: [{ type: "refusal", refusal: "not exposed" }],
                },
              ],
            }),
          ),
        ),
    );
    const quota = await call();
    expect(quota.status).toBe(503);
    expect(await quota.json()).toMatchObject({
      error: { code: "AUTOFILL_QUOTA" },
    });
    expect((await call()).status).toBe(422);
    env.EVENT_AUTOFILL_MODEL = "gpt-6-astra";
    try {
      expect((await call()).status).toBe(503);
    } finally {
      delete env.EVENT_AUTOFILL_MODEL;
    }
  });
  test("模型服务失败、超时、截断与无效JSON都有中文错误", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response("not exposed", { status: 401 }))
      .mockRejectedValueOnce(new DOMException("aborted", "TimeoutError"))
      .mockResolvedValueOnce(reply({ fields, warnings: [] }, "incomplete"))
      .mockResolvedValueOnce(new Response("not JSON"));
    vi.stubGlobal("fetch", fetchMock);
    for (const status of [503, 504, 502, 502]) {
      const result = await call();
      expect(result.status).toBe(status);
      expect(JSON.stringify(await result.json())).not.toContain("not exposed");
    }
  });
  test("每个管理员一分钟最多5次模型请求", async () => {
    const fetchMock = vi.fn().mockImplementation(() => reply());
    vi.stubGlobal("fetch", fetchMock);
    for (let n = 0; n < 5; n++) expect((await call()).status).toBe(200);
    expect((await call()).status).toBe(429);
    expect(fetchMock).toHaveBeenCalledTimes(5);
  });
});
