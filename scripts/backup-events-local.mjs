// Local-only backup and isolated restore rehearsal. Never accepts remote flags.
import { execFileSync } from "node:child_process";
import { createHash, randomUUID } from "node:crypto";
import {
  cpSync,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { resolve, join, relative } from "node:path";
import { DatabaseSync } from "node:sqlite";

if (process.argv.length > 2)
  throw new Error("This command is local-only and takes no arguments.");
const root = process.cwd();
const backup = resolve(
  "output/backups",
  `${new Date().toISOString().replaceAll(":", "-")}-${randomUUID().slice(0, 8)}`,
);
mkdirSync(backup, { recursive: true, mode: 0o700 });
const wrangler = (args) =>
  execFileSync(
    process.execPath,
    ["node_modules/wrangler/bin/wrangler.js", ...args],
    {
      cwd: root,
      encoding: "utf8",
      env: { ...process.env, NO_COLOR: "1", WRANGLER_SEND_METRICS: "false" },
    },
  );
const sha = (bytes) => createHash("sha256").update(bytes).digest("hex");
const inventory = [];
function scan(directory) {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const file = join(directory, entry.name);
    if (entry.isDirectory()) scan(file);
    else if (entry.isFile())
      inventory.push({
        path: relative(backup, file),
        bytes: statSync(file).size,
        sha256: sha(readFileSync(file)),
      });
  }
}
// Preserve the entire local emulator state, including versioned R2 objects.
if (existsSync(".wrangler/state"))
  cpSync(".wrangler/state", join(backup, "emulator-state"), {
    recursive: true,
    errorOnExist: true,
    force: false,
  });
wrangler([
  "d1",
  "export",
  "DB",
  "--local",
  "--output",
  join(backup, "database.sql"),
]);
const restore = join(backup, "isolated-restore");
wrangler([
  "d1",
  "execute",
  "DB",
  "--local",
  "--persist-to",
  restore,
  "--file",
  join(backup, "database.sql"),
]);
const query = (command) =>
  JSON.parse(
    wrangler([
      "d1",
      "execute",
      "DB",
      "--local",
      "--persist-to",
      restore,
      "--command",
      command,
      "--json",
    ]),
  );
// D1 intentionally disallows integrity_check. Run that on a separate SQLite
// restore of the same SQL, then check foreign keys on the actual local D1.
const sqlCheck = new DatabaseSync(":memory:");
sqlCheck.exec(readFileSync(join(backup, "database.sql"), "utf8"));
const integrity = sqlCheck.prepare("PRAGMA integrity_check").get();
sqlCheck.close();
const foreignKeys = query("PRAGMA foreign_key_check;");
if (integrity.integrity_check !== "ok" || foreignKeys[0]?.results?.length)
  throw new Error(
    "Isolated restore integrity/foreign-key check failed; retained backup for investigation.",
  );
const tables = query(
  "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name NOT GLOB '_cf_*' ORDER BY name;",
)[0].results.map((row) => row.name);
const counts = {};
for (const table of tables) {
  if (!/^[a-zA-Z0-9_]+$/.test(table))
    throw new Error("Unexpected table identifier");
}
for (const result of query(
  tables
    .map(
      (table) =>
        `SELECT '${table}' AS name, COUNT(*) AS count FROM "${table}";`,
    )
    .join("\n"),
)) {
  for (const row of result.results) counts[row.name] = row.count;
}
let media = [];
if (tables.includes("event_media"))
  media = query(
    "SELECT ma.id, ma.object_key, ma.byte_size, ma.checksum_sha256, ma.status FROM media_assets ma JOIN event_media em ON em.media_id = ma.id ORDER BY ma.id;",
  )[0].results;
writeFileSync(
  join(backup, "media-inventory.json"),
  JSON.stringify(media, null, 2),
  { mode: 0o600, flag: "wx" },
);
scan(backup);
const manifest = {
  formatVersion: 1,
  createdAt: new Date().toISOString(),
  environment: "local-only",
  databaseId: "local",
  gitHead: execFileSync("git", ["rev-parse", "HEAD"], {
    encoding: "utf8",
  }).trim(),
  workingTreeDirty: Boolean(
    execFileSync("git", ["status", "--porcelain"], { encoding: "utf8" }).trim(),
  ),
  schemaMigrations: tables.includes("d1_migrations")
    ? query("SELECT name FROM d1_migrations ORDER BY id;")[0].results.map(
        (row) => row.name,
      )
    : [],
  availableMigrationFiles: readdirSync("migrations").filter((name) =>
    name.endsWith(".sql"),
  ),
  integrity: "ok",
  foreignKeyViolations: 0,
  counts,
  files: inventory,
  restoration:
    "SQL imported into isolated local D1; original state unchanged. Real cloud/media recovery remains a pre-launch rehearsal.",
};
writeFileSync(
  join(backup, "manifest.json"),
  JSON.stringify(manifest, null, 2),
  { mode: 0o600, flag: "wx" },
);
console.log(
  `Local backup and isolated restore verified: ${relative(root, backup)} (${tables.length} tables, ${inventory.length} files).`,
);
