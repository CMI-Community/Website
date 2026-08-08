import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const persistTo = mkdtempSync(join(tmpdir(), "cmi-d1-migration-"));

function wrangler(args) {
  return execFileSync("npx", ["wrangler", ...args], {
    cwd: process.cwd(),
    encoding: "utf8",
    env: { ...process.env, NO_COLOR: "1" },
  });
}

try {
  wrangler(["d1", "migrations", "apply", "DB", "--local", "--persist-to", persistTo]);
  const raw = wrangler([
    "d1",
    "execute",
    "DB",
    "--local",
    "--persist-to",
    persistTo,
    "--command",
    "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name; PRAGMA foreign_key_check;",
    "--json",
  ]);
  const result = JSON.parse(raw);
  const names = new Set(
    result.flatMap((entry) => entry.results ?? []).map((row) => row.name).filter(Boolean),
  );
  const required = [
    "auth_users",
    "auth_sessions",
    "auth_accounts",
    "auth_verifications",
    "profiles",
    "user_roles",
    "invitations",
    "content_entries",
    "content_revisions",
    "media_assets",
    "audit_logs",
    "cmi_feedback_ideas",
    "cmi_feedback_votes",
  ];
  const missing = required.filter((name) => !names.has(name));
  if (missing.length) throw new Error(`Missing D1 tables: ${missing.join(", ")}`);
  console.log(`D1 migration smoke passed with ${required.length} required tables.`);
} finally {
  rmSync(persistTo, { recursive: true, force: true });
}
