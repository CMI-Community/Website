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
}
