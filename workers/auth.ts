import { APIError } from "better-auth/api";
import { betterAuth, type BetterAuthOptions } from "better-auth";
import { Resend } from "resend";
import type { Role } from "../app/shared/auth/roles";

function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

async function deliverAuthEmail(
  env: CloudflareEnv,
  message: { to: string; subject: string; html: string },
): Promise<void> {
  if (!env.RESEND_API_KEY) {
    if (env.APP_ENV === "development") return;
    throw new Error("RESEND_API_KEY is required outside local development");
  }

  const result = await new Resend(env.RESEND_API_KEY).emails.send({
    from: "CMI Community <auth@cmi.community>",
    ...message,
  });
  if (result.error) throw new Error(`Resend rejected auth email: ${result.error.name}`);
}

async function activeInvitation(env: CloudflareEnv, email: string) {
  return env.DB.prepare(
    `SELECT id, role
       FROM invitations
      WHERE lower(email) = ?1
        AND accepted_at IS NULL
        AND revoked_at IS NULL
        AND expires_at > strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
      ORDER BY created_at DESC
      LIMIT 1`,
  )
    .bind(normalizeEmail(email))
    .first<{ id: string; role: Role }>();
}

async function provisionVerifiedIdentity(env: CloudflareEnv, userId: string): Promise<void> {
  const user = await env.DB.prepare(
    "SELECT id, name, email, emailVerified FROM auth_users WHERE id = ?1",
  )
    .bind(userId)
    .first<{ id: string; name: string; email: string; emailVerified: number }>();
  if (!user || !user.emailVerified) return;

  const email = normalizeEmail(user.email);
  const invitation = await activeInvitation(env, email);
  const isBootstrap = Boolean(
    env.BOOTSTRAP_ADMIN_EMAIL && email === normalizeEmail(env.BOOTSTRAP_ADMIN_EMAIL),
  );
  const role: Role = isBootstrap ? "admin" : invitation?.role ?? "member";
  const now = new Date().toISOString();
  const statements = [
    env.DB.prepare(
      `INSERT INTO profiles (user_id, display_name)
       VALUES (?1, ?2)
       ON CONFLICT (user_id) DO NOTHING`,
    ).bind(user.id, user.name),
    env.DB.prepare(
      `INSERT INTO user_roles (user_id, role, granted_by)
       VALUES (?1, 'member', NULL)
       ON CONFLICT (user_id, role) DO NOTHING`,
    ).bind(user.id),
    env.DB.prepare(
      `INSERT INTO user_roles (user_id, role, granted_by)
       VALUES (?1, ?2, NULL)
       ON CONFLICT (user_id, role) DO NOTHING`,
    ).bind(user.id, role),
  ];

  if (invitation) {
    statements.push(
      env.DB.prepare(
        `UPDATE invitations
            SET accepted_at = ?2, accepted_by = ?1
          WHERE id = ?3 AND accepted_at IS NULL`,
      ).bind(user.id, now, invitation.id),
    );
  }

  statements.push(
    env.DB.prepare(
      `INSERT INTO audit_logs
        (id, actor_user_id, action, resource_type, resource_id, metadata_json)
       VALUES (?1, ?2, 'identity.provisioned', 'user', ?2, ?3)`,
    ).bind(crypto.randomUUID(), user.id, JSON.stringify({ role, bootstrap: isBootstrap })),
  );
  await env.DB.batch(statements);
}

export function createAuth(env: CloudflareEnv, ctx: ExecutionContext) {
  const secret = env.BETTER_AUTH_SECRET ||
    (env.APP_ENV === "development" ? "cmi-local-development-secret-change-me" : undefined);
  if (!secret) throw new Error("BETTER_AUTH_SECRET is required outside local development");
  const socialProviders: NonNullable<BetterAuthOptions["socialProviders"]> = {};
  if (env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET) {
    socialProviders.google = {
      clientId: env.GOOGLE_CLIENT_ID,
      clientSecret: env.GOOGLE_CLIENT_SECRET,
    };
  }
  if (env.GITHUB_CLIENT_ID && env.GITHUB_CLIENT_SECRET) {
    socialProviders.github = {
      clientId: env.GITHUB_CLIENT_ID,
      clientSecret: env.GITHUB_CLIENT_SECRET,
    };
  }

  return betterAuth({
    appName: "CMI Community",
    basePath: "/api/auth",
    baseURL: env.BETTER_AUTH_URL,
    secret,
    database: env.DB,
    user: { modelName: "auth_users" },
    session: { modelName: "auth_sessions", cookieCache: { enabled: true, maxAge: 300 } },
    account: {
      modelName: "auth_accounts",
      accountLinking: {
        enabled: true,
        disableImplicitLinking: false,
        requireLocalEmailVerified: true,
        trustedProviders: ["google", "github"],
        allowDifferentEmails: false,
        allowUnlinkingAll: false,
      },
    },
    verification: { modelName: "auth_verifications", storeInDatabase: true },
    rateLimit: {
      enabled: true,
      storage: "database",
      modelName: "auth_rate_limits",
      window: 60,
      max: 100,
      customRules: {
        "/sign-up/email": { window: 3600, max: 5 },
        "/request-password-reset": { window: 3600, max: 5 },
        "/send-verification-email": { window: 3600, max: 5 },
      },
    },
    emailAndPassword: {
      enabled: true,
      requireEmailVerification: true,
      minPasswordLength: 12,
      revokeSessionsOnPasswordReset: true,
      sendResetPassword: async ({ user, url }) => {
        await deliverAuthEmail(env, {
          to: user.email,
          subject: "重置你的 CMI Community 密码",
          html: `<p>你请求了密码重置。</p><p><a href="${url}">继续重置密码</a></p><p>如果不是你发起的，请忽略本邮件。</p>`,
        });
      },
    },
    emailVerification: {
      sendOnSignUp: true,
      sendOnSignIn: true,
      autoSignInAfterVerification: false,
      expiresIn: 60 * 60,
      sendVerificationEmail: async ({ user, url }) => {
        await deliverAuthEmail(env, {
          to: user.email,
          subject: "验证你的 CMI Community 邮箱",
          html: `<p>欢迎来到 CMI Community。</p><p><a href="${url}">验证邮箱</a></p><p>链接将在一小时后失效。</p>`,
        });
      },
    },
    socialProviders,
    trustedOrigins: [
      env.BETTER_AUTH_URL,
      "http://localhost:5173",
      "http://127.0.0.1:5173",
      "https://staging.cmi.community",
      "https://cmi.community",
    ],
    databaseHooks: {
      user: {
        create: {
          before: async (user) => {
            const email = normalizeEmail(user.email);
            const isBootstrap = Boolean(
              env.BOOTSTRAP_ADMIN_EMAIL && email === normalizeEmail(env.BOOTSTRAP_ADMIN_EMAIL),
            );
            if (!isBootstrap && !(await activeInvitation(env, email))) {
              throw new APIError("FORBIDDEN", {
                message: "CMI Community 当前仅接受受邀邮箱注册。",
              });
            }
            return { data: { ...user, email } };
          },
          after: async (user) => {
            await env.DB.prepare(
              `INSERT INTO profiles (user_id, display_name)
               VALUES (?1, ?2)
               ON CONFLICT (user_id) DO NOTHING`,
            )
              .bind(user.id, user.name)
              .run();
          },
        },
      },
      session: {
        create: {
          after: async (session) => provisionVerifiedIdentity(env, session.userId),
        },
      },
    },
    advanced: {
      useSecureCookies: env.APP_ENV !== "development",
      database: { generateId: "uuid" },
      ipAddress: { ipAddressHeaders: ["cf-connecting-ip"] },
      backgroundTasks: { handler: (promise) => ctx.waitUntil(promise) },
    },
  });
}
