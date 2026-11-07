// Wrangler generates public bindings in worker-configuration.d.ts. Secret
// bindings are declaration-merged here because their names are not stored in
// wrangler.jsonc and their values must never enter Git.
interface CloudflareEnv {
  BETTER_AUTH_SECRET: string;
  RESEND_API_KEY?: string;
  GOOGLE_CLIENT_ID?: string;
  GOOGLE_CLIENT_SECRET?: string;
  GITHUB_CLIENT_ID?: string;
  GITHUB_CLIENT_SECRET?: string;
  BOOTSTRAP_ADMIN_EMAIL?: string;
  /** Sole activity administrator, configured as a secret rather than public source. */
  EVENT_ADMIN_EMAIL?: string;
  /** Rotate after database restoration; kept outside the restored database. */
  INTEGRATION_KEY_EPOCH?: string;
  /** Server-side only, used when the administrator explicitly requests autofill. */
  OPENAI_API_KEY?: string;
  EVENT_AUTOFILL_MODEL?: string;
}
