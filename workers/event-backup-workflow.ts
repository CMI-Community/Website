import {
  WorkflowEntrypoint,
  type WorkflowEvent,
  type WorkflowStep,
} from "cloudflare:workers";
import {
  parseD1ExportResponse,
  type D1ExportStatus,
} from "./event-backup-export";

interface BackupEnv {
  BACKUP_WORKFLOW: Workflow;
  DB: D1Database;
  EVENT_MEDIA: R2Bucket;
  EVENT_BACKUPS: R2Bucket;
  ACCOUNT_ID: string;
  DATABASE_ID: string;
  D1_REST_API_TOKEN: string;
  WORKER_VERSION: string;
}
const sha256 = async (bytes: ArrayBuffer) =>
  Array.from(
    new Uint8Array(await crypto.subtle.digest("SHA-256", bytes)),
    (value) => value.toString(16).padStart(2, "0"),
  ).join("");

// Separate worker: no schedule is enabled in the application configuration.
// Cloud resources, token and notification rule must be provisioned before enabling.
export class EventBackupWorkflow extends WorkflowEntrypoint<BackupEnv> {
  async run(event: WorkflowEvent<unknown>, step: WorkflowStep) {
    const prefix = `database/${event.instanceId}`;
    const retry = {
      retries: {
        limit: 8,
        delay: "30 seconds" as const,
        backoff: "exponential" as const,
      },
    };
    try {
      const exportRequest = async (
        payload: object,
      ): Promise<D1ExportStatus> => {
        if (
          !this.env.ACCOUNT_ID ||
          !this.env.DATABASE_ID ||
          !this.env.D1_REST_API_TOKEN ||
          !this.env.WORKER_VERSION
        )
          throw new Error("Backup configuration incomplete");
        const response = await fetch(
          `https://api.cloudflare.com/client/v4/accounts/${encodeURIComponent(this.env.ACCOUNT_ID)}/d1/database/${encodeURIComponent(this.env.DATABASE_ID)}/export`,
          {
            method: "POST",
            headers: {
              "content-type": "application/json",
              authorization: `Bearer ${this.env.D1_REST_API_TOKEN}`,
            },
            body: JSON.stringify({ output_format: "polling", ...payload }),
          },
        );
        if (!response.ok) throw new Error(`D1 export HTTP ${response.status}`);
        return parseD1ExportResponse(await response.json());
      };
      const bookmark = await step.do("start-export", retry, async () => {
        const body = await exportRequest({ output_format: "polling" });
        if (!body.bookmark) throw new Error("Export bookmark not ready");
        return body.bookmark;
      });
      const sql = await step.do("verify-and-store-sql", retry, async () => {
        const body = await exportRequest({ current_bookmark: bookmark });
        if (!body.signedUrl) throw new Error("Export still running");
        const url = new URL(body.signedUrl);
        if (url.protocol !== "https:") throw new Error("Invalid export URL");
        const response = await fetch(url);
        if (!response.ok) throw new Error("SQL download failed");
        // Bound memory; larger databases must move to streaming hash before launch.
        const reader = response.body?.getReader();
        if (!reader) throw new Error("Empty export stream");
        const chunks: Uint8Array[] = [];
        let size = 0;
        for (;;) {
          const chunk = await reader.read();
          if (chunk.done) break;
          size += chunk.value.byteLength;
          if (size > 32 * 1024 * 1024) {
            await reader.cancel();
            throw new Error("SQL exceeds verified 32 MiB limit");
          }
          chunks.push(chunk.value);
        }
        const bytes = new Uint8Array(size);
        let offset = 0;
        for (const chunk of chunks) {
          bytes.set(chunk, offset);
          offset += chunk.byteLength;
        }
        if (
          !size ||
          !new TextDecoder()
            .decode(bytes.subarray(0, 8192))
            .includes("CREATE TABLE")
        )
          throw new Error("Invalid SQL export");
        const checksum = await sha256(bytes.buffer);
        const key = `${prefix}/database.sql`;
        await this.env.EVENT_BACKUPS.put(key, bytes, {
          httpMetadata: {
            contentType: "application/sql",
            cacheControl: "no-store",
          },
          customMetadata: { sha256: checksum },
        });
        const stored = await this.env.EVENT_BACKUPS.get(key);
        if (!stored || (await sha256(await stored.arrayBuffer())) !== checksum)
          throw new Error("Stored SQL checksum mismatch");
        return { key, bytes: size, sha256: checksum };
      });
      const metadata = await step.do(
        "verify-media-and-manifest",
        retry,
        async () => {
          const rows = await this.env.DB.prepare(
            `SELECT ma.id,ma.object_key,ma.byte_size,ma.checksum_sha256 FROM media_assets ma JOIN event_media em ON em.media_id=ma.id WHERE em.verified_at IS NOT NULL AND ma.checksum_sha256 IS NOT NULL ORDER BY ma.id`,
          ).all<{
            id: string;
            object_key: string;
            byte_size: number;
            checksum_sha256: string;
          }>();
          const media = [];
          for (const row of rows.results) {
            const source = await this.env.EVENT_MEDIA.get(row.object_key);
            if (
              !source ||
              source.size !== row.byte_size ||
              source.size > 10 * 1024 * 1024
            )
              throw new Error(`Media missing or oversized: ${row.id}`);
            const bytes = await source.arrayBuffer();
            const checksum = await sha256(bytes);
            if (checksum !== row.checksum_sha256)
              throw new Error(`Media checksum mismatch: ${row.id}`);
            const key = `media/${checksum}`;
            const existing = await this.env.EVENT_BACKUPS.get(key);
            if (
              existing &&
              (await sha256(await existing.arrayBuffer())) !== checksum
            )
              throw new Error(`Backup media conflict: ${row.id}`);
            if (!existing)
              await this.env.EVENT_BACKUPS.put(key, bytes, {
                customMetadata: { sha256: checksum },
              });
            const verified = await this.env.EVENT_BACKUPS.get(key);
            if (
              !verified ||
              (await sha256(await verified.arrayBuffer())) !== checksum
            )
              throw new Error(`Backup media verification failed: ${row.id}`);
            media.push({
              id: row.id,
              objectKey: row.object_key,
              backupKey: key,
              bytes: row.byte_size,
              sha256: checksum,
            });
          }
          const migrations = await this.env.DB.prepare(
            "SELECT name FROM d1_migrations ORDER BY id",
          ).all<{ name: string }>();
          const counts = await this.env.DB.prepare(
            "SELECT (SELECT COUNT(*) FROM event_details) events,(SELECT COUNT(*) FROM content_revisions) revisions,(SELECT COUNT(*) FROM event_unpublish_records WHERE status='pending') pendingUnpublishRecords",
          ).first<{
            events: number;
            revisions: number;
            pendingUnpublishRecords: number;
          }>();
          return {
            media,
            migrations: migrations.results,
            observedCounts: counts,
            mediaInventoryBasis:
              "all verified immutable versions observed after SQL export",
            countsObservedAt: new Date().toISOString(),
          };
        },
      );
      await step.do("complete-backup", retry, async () => {
        await this.env.EVENT_BACKUPS.put(
          `${prefix}/manifest.json`,
          JSON.stringify({
            formatVersion: 1,
            complete: true,
            createdAt: new Date().toISOString(),
            databaseId: this.env.DATABASE_ID,
            workerVersion: this.env.WORKER_VERSION,
            bookmark,
            sql,
            ...metadata,
          }),
          {
            httpMetadata: {
              contentType: "application/json",
              cacheControl: "no-store",
            },
          },
        );
      });
      return { complete: true, prefix };
    } catch {
      // Persist a non-sensitive failure marker and fail the Workflow for alerts/retry.
      await this.env.EVENT_BACKUPS.put(
        `${prefix}/failure.json`,
        JSON.stringify({
          complete: false,
          failedAt: new Date().toISOString(),
          workflowId: event.instanceId,
        }),
      ).catch(() => undefined);
      console.error("Event backup failed", { workflowId: event.instanceId });
      throw new Error(
        "Event backup failed; inspect workflow and private failure marker.",
      );
    }
  }
}

export default {
  fetch() {
    return new Response("Not found", { status: 404 });
  },
  scheduled(event, env, ctx) {
    ctx.waitUntil(
      env.BACKUP_WORKFLOW.create({
        id: `events-${new Date(event.scheduledTime).toISOString().slice(0, 10)}`,
      }),
    );
  },
} satisfies ExportedHandler<BackupEnv>;
