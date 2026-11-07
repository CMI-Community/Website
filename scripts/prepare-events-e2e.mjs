import { existsSync, writeFileSync } from "node:fs";
import { randomBytes } from "node:crypto";

// Prepare only a missing local test configuration. Existing user settings stay intact.
// Remote suites never get a local administrator fixture or configuration change.
if (!process.env.PLAYWRIGHT_BASE_URL && !existsSync(".dev.vars")) {
  if (process.env.CLOUDFLARE_ENV)
    throw new Error(
      "Local E2E setup must not target a Cloudflare environment.",
    );
  writeFileSync(
    ".dev.vars",
    [
      `BETTER_AUTH_SECRET=${randomBytes(32).toString("hex")}`,
      "BETTER_AUTH_URL=http://localhost:5173",
      "EVENT_ADMIN_EMAIL=activity-admin@example.com",
      "INTEGRATION_KEY_EPOCH=synthetic-local-e2e",
      "",
    ].join("\n"),
    { mode: 0o600, flag: "wx" },
  );
  console.log(
    "Created synthetic local E2E configuration; no email delivery is configured.",
  );
}
