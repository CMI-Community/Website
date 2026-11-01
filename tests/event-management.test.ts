/// <reference types="@cloudflare/workers-types" />
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { DatabaseSync, type SQLInputValue } from "node:sqlite";
import { readFileSync } from "node:fs";
import {
  parseEventInput,
  type EventInput,
} from "../app/modules/activities/event-schema";
import {
  getEvent,
  listEvents,
} from "../app/modules/activities/event-repository.server";
import {
  saveEvent,
  unpublishEvent,
} from "../app/modules/activities/event-service.server";
import {
  listPublicActivities,
  listPublicEvents,
  loadPublicPosterCatalog,
} from "../app/modules/activities/event-public";

// Exercise actual SQLite constraints and transactions through the D1 surface.
// Wrangler's separate --local migration smoke covers the workerd adapter.
function databaseAdapter(sqlite: DatabaseSync): D1Database {
  class Statement {
    constructor(
      readonly sql: string,
      readonly values: SQLInputValue[] = [],
    ) {}
    bind(...values: SQLInputValue[]) {
      return new Statement(this.sql, values);
    }
    async first<T>() {
      return (sqlite.prepare(this.sql).get(...this.values) as T) ?? null;
    }
    async all<T>() {
      return {
        results: sqlite.prepare(this.sql).all(...this.values) as T[],
        success: true,
      };
    }
    async run() {
      return {
        success: true,
        meta: sqlite.prepare(this.sql).run(...this.values),
      };
    }
  }
  return {
    prepare: (sql: string) => new Statement(sql),
    batch: async (statements: Statement[]) => {
      sqlite.exec("BEGIN");
      try {
        const results = [];
        for (const statement of statements) results.push(await statement.run());
        sqlite.exec("COMMIT");
        return results;
      } catch (error) {
        sqlite.exec("ROLLBACK");
        throw error;
      }
    },
  } as unknown as D1Database;
}
const input: EventInput = {
  title: "本地活动测试",
  startsAt: "2026-11-15T14:00:00+07:00",
  endsAt: "2026-11-15T16:00:00+07:00",
  location: "测试场地",
  category: "测试",
  summary: "合成测试活动",
  posterMediaId: "test-media",
  posterAlt: null,
  detailUrl: null,
  registrationUrl: null,
  initiator: "测试",
  series: null,
  sourcePublishedAt: null,
  status: "draft",
};
const actor = { userId: "test-admin", actorType: "admin" as const };
let sqlite: DatabaseSync;
let db: D1Database;
beforeEach(() => {
  sqlite = new DatabaseSync(":memory:");
  for (const name of [
    "0001_platform_foundation.sql",
    "0002_fix_auth_rate_limit_id.sql",
    "0003_add_project_archive.sql",
    "0004_add_activity_management.sql",
  ])
    sqlite.exec(readFileSync(`migrations/${name}`, "utf8"));
  sqlite.exec(`INSERT INTO auth_users(id,name,email,emailVerified,createdAt,updatedAt) VALUES('test-admin','Synthetic admin','admin@example.com',1,0,0);
    INSERT INTO media_assets(id,object_key,mime_type,byte_size,status,created_by) VALUES('test-media','events/test/v1/poster.png','image/png',100,'ready','test-admin');
    INSERT INTO event_media(media_id,width,height,verified_at) VALUES('test-media',100,200,'2026-11-01T00:00:00Z');`);
  db = databaseAdapter(sqlite);
});
afterEach(() => sqlite.close());

describe("event migration and validation", () => {
  it("retains all ten source records and both original school times", async () => {
    const events = await listEvents(db);
    expect(events).toHaveLength(10);
    expect(
      sqlite.prepare("SELECT count(*) n FROM event_migration_records").get(),
    ).toMatchObject({ n: 10 });
    const placeholders = events.filter(
      (event) => event.timePrecision === "backfill_placeholder",
    );
    expect(placeholders).toHaveLength(2);
    for (const event of placeholders) {
      expect(event.eventDate).toBe("2026-07-10");
      expect(event.startsAt).toBeNull();
      expect(event.endsAt).toBeNull();
      expect(event.summary).toContain("该时间为后期补录");
    }
    expect(
      sqlite
        .prepare(
          "SELECT original_json FROM event_migration_records WHERE event_id LIKE '%02-montfort'",
        )
        .get()?.original_json,
    ).toContain("2026-09-02T13:30:00+07:00");
    expect(await listPublicEvents(db)).toHaveLength(0);
    expect(sqlite.prepare("PRAGMA foreign_key_check").all()).toHaveLength(0);
  });
  it("rejects invented placeholders, unknown fields, unsafe links and reversed times", () => {
    expect(() =>
      parseEventInput({ ...input, startsAt: null, endsAt: null }),
    ).toThrow(/真实/);
    expect(() => parseEventInput({ ...input, unexpected: true })).toThrow();
    expect(() =>
      parseEventInput({ ...input, detailUrl: "javascript:alert(1)" }),
    ).toThrow();
    expect(() =>
      parseEventInput({ ...input, endsAt: "2026-11-15T13:00:00+07:00" }),
    ).toThrow(/晚于/);
    expect(() => parseEventInput({ ...input, location: "" })).toThrow(/地点/);
  });
});
describe("event atomic writes", () => {
  it("creates, revises, publishes and unpublishes with revision and independent backup intent", async () => {
    const created = await saveEvent(db, input, { actor, createOnly: true });
    expect(created.status).toBe(201);
    expect(created.event.version).toBe(1);
    expect(await listPublicEvents(db)).toHaveLength(0);
    const published = await saveEvent(
      db,
      { ...input, status: "published" },
      { actor, id: created.event.id, expectedVersion: 1 },
    );
    expect(published.etag).toBe('"v2"');
    expect(await listPublicEvents(db)).toHaveLength(1);
    const hidden = await unpublishEvent(db, created.event.id, {
      actor,
      expectedVersion: 2,
    });
    expect(hidden.pendingBackupId).toBeTruthy();
    expect(await listPublicEvents(db)).toHaveLength(0);
    await expect(
      unpublishEvent(db, created.event.id, { actor, expectedVersion: 2 }),
    ).rejects.toMatchObject({ status: 412 });
    const retry = await unpublishEvent(db, created.event.id, {
      actor,
      expectedVersion: 3,
    });
    expect(retry.event.version).toBe(3);
    expect(retry.pendingBackupId).toBe(hidden.pendingBackupId);
    expect(
      sqlite
        .prepare("SELECT count(*) n FROM content_revisions WHERE content_id=?")
        .get(created.event.id),
    ).toMatchObject({ n: 3 });
  });
  it("requires explicit unpublish before returning published content to draft", async () => {
    const published = await saveEvent(
      db,
      { ...input, status: "published" },
      { actor },
    );
    await expect(
      saveEvent(db, input, {
        actor,
        id: published.event.id,
        expectedVersion: 1,
      }),
    ).rejects.toMatchObject({ status: 409, code: "UNPUBLISH_FIRST" });
    await expect(
      saveEvent(db, input, {
        actor,
        id: published.event.id,
        expectedVersion: 1,
        restoredFromVersion: 1,
      }),
    ).rejects.toMatchObject({ status: 409, code: "UNPUBLISH_FIRST" });
    expect((await getEvent(db, published.event.id))?.status).toBe("published");
    const hidden = await unpublishEvent(db, published.event.id, {
      actor,
      expectedVersion: 1,
    });
    await expect(
      saveEvent(
        db,
        { ...input, status: "published" },
        { actor, id: published.event.id, expectedVersion: 2 },
      ),
    ).rejects.toMatchObject({ status: 409, code: "UNPUBLISH_BACKUP_PENDING" });
    sqlite
      .prepare(
        "UPDATE event_unpublish_records SET status='complete' WHERE id=?",
      )
      .run(hidden.pendingBackupId!);
    const restored = await saveEvent(db, input, {
      actor,
      id: published.event.id,
      expectedVersion: 2,
      restoredFromVersion: 1,
    });
    expect(restored.event.status).toBe("draft");
    expect(restored.event.version).toBe(3);
    expect(
      sqlite
        .prepare(
          "SELECT metadata_json FROM audit_logs WHERE action='event.restored' AND resource_id=?",
        )
        .get(published.event.id)?.metadata_json,
    ).toContain('"restoredFromVersion":1');
  });
  it("rejects stale versions and a revoked guard without partial writes", async () => {
    const created = await saveEvent(db, input, { actor });
    await expect(
      saveEvent(
        db,
        { ...input, title: "stale" },
        { actor, id: created.event.id, expectedVersion: 0 },
      ),
    ).rejects.toMatchObject({ status: 412 });
    await expect(
      saveEvent(
        db,
        { ...input, title: "revoked" },
        {
          actor,
          id: created.event.id,
          expectedVersion: 1,
          guard: { sql: "0=1", bindings: [] },
        },
      ),
    ).rejects.toMatchObject({ status: 403 });
    expect((await getEvent(db, created.event.id))?.title).toBe(input.title);
    expect(
      sqlite
        .prepare("SELECT count(*) n FROM content_revisions WHERE content_id=?")
        .get(created.event.id),
    ).toMatchObject({ n: 1 });
    expect(
      sqlite.prepare("SELECT count(*) n FROM event_write_assertions").get(),
    ).toMatchObject({ n: 0 });
  });
  it("rolls back a version race detected inside the mutation batch", async () => {
    const created = await saveEvent(db, input, { actor });
    let intercepted = false;
    const racedDb = {
      prepare: db.prepare.bind(db),
      batch: async (statements: D1PreparedStatement[]) => {
        if (!intercepted) {
          intercepted = true;
          await saveEvent(
            db,
            { ...input, title: "concurrent winner" },
            { actor, id: created.event.id, expectedVersion: 1 },
          );
        }
        return db.batch(statements);
      },
    } as unknown as D1Database;
    await expect(
      saveEvent(
        racedDb,
        { ...input, title: "stale loser" },
        { actor, id: created.event.id, expectedVersion: 1 },
      ),
    ).rejects.toMatchObject({ status: 412 });
    const latest = await getEvent(db, created.event.id);
    expect(latest?.title).toBe("concurrent winner");
    expect(latest?.version).toBe(2);
    expect(
      sqlite
        .prepare("SELECT count(*) n FROM content_revisions WHERE content_id=?")
        .get(created.event.id),
    ).toMatchObject({ n: 2 });
  });
  it("rechecks revocation inside the write transaction", async () => {
    sqlite.exec(
      "CREATE TABLE test_grant(active INTEGER);INSERT INTO test_grant VALUES(1);",
    );
    const racedDb = {
      prepare: db.prepare.bind(db),
      batch: async (statements: D1PreparedStatement[]) => {
        sqlite.exec("UPDATE test_grant SET active=0");
        return db.batch(statements);
      },
    } as unknown as D1Database;
    await expect(
      saveEvent(racedDb, input, {
        actor,
        guard: {
          sql: "EXISTS(SELECT 1 FROM test_grant WHERE active=1)",
          bindings: [],
        },
      }),
    ).rejects.toMatchObject({ status: 403 });
    expect(await listEvents(db)).toHaveLength(10);
    expect(
      sqlite.prepare("SELECT count(*) n FROM event_write_assertions").get(),
    ).toMatchObject({ n: 0 });
  });
  it("replays identical requests before checking ETag and rejects conflicting retries", async () => {
    const options = {
      actor,
      createOnly: true,
      external: {
        source: "test",
        externalId: "one",
        sourceVersion: 1,
        requestHash: "body1",
      },
      idempotency: { keyId: "key1", key: "request1", requestHash: "request1" },
    };
    const first = await saveEvent(db, input, options);
    await expect(
      saveEvent(db, input, { ...options, guard: { sql: "0=1", bindings: [] } }),
    ).rejects.toMatchObject({ status: 403 });
    const replay = await saveEvent(db, input, options);
    expect(replay.replayed).toBe(true);
    expect(replay.event.id).toBe(first.event.id);
    await expect(
      saveEvent(db, input, {
        ...options,
        idempotency: { ...options.idempotency, requestHash: "different" },
      }),
    ).rejects.toMatchObject({ status: 409 });
    const retry = await saveEvent(db, input, {
      ...options,
      idempotency: undefined,
    });
    expect(retry.event.id).toBe(first.event.id);
    await expect(
      saveEvent(db, input, {
        ...options,
        idempotency: undefined,
        external: { ...options.external, requestHash: "different" },
      }),
    ).rejects.toMatchObject({ status: 409 });
  });
  it("rejects sharing one private poster between independently published events", async () => {
    await saveEvent(db, input, { actor });
    await expect(saveEvent(db, input, { actor })).rejects.toMatchObject({
      status: 409,
      code: "MEDIA_ALREADY_USED",
    });
  });
  it("can unpublish pending migration media and never reinserts a stale historical copy", async () => {
    const id = "cmi-ai-3d-school-workshop-02-montfort";
    const event = await getEvent(db, id);
    const result = await unpublishEvent(db, id, { actor, expectedVersion: 1 });
    expect(result.event.status).toBe("unpublished");
    const env = {
      DB: db,
      MEDIA: {
        get: async () => ({
          json: async () => [{ id: "old-copy", articleUrl: event?.detailUrl }],
        }),
      },
    } as unknown as Parameters<typeof loadPublicPosterCatalog>[0];
    expect((await loadPublicPosterCatalog(env)).posters).toHaveLength(0);
  });
  it("keeps placeholder times null in every public activity DTO", async () => {
    sqlite.exec(
      "UPDATE media_assets SET status='ready';UPDATE event_media SET verified_at='2026-11-01T00:00:00Z';",
    );
    const placeholders = (await listPublicActivities(db)).filter(
      (event) => event.timePrecision === "backfill_placeholder",
    );
    expect(placeholders).toHaveLength(2);
    for (const event of placeholders) {
      expect(event.startsAt).toBeNull();
      expect(event.endsAt).toBeNull();
      expect(event.dateLabel).toBe("2026.07.10（补录日期）");
      expect(event.timeLabel).toBe("");
    }
  });
});
