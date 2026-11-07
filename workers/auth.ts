import { APIError, createAuthMiddleware } from "better-auth/api";
import { betterAuth, type BetterAuthOptions } from "better-auth";
import { emailOTP } from "better-auth/plugins";
import { Resend } from "resend";
import type { Role } from "../app/shared/auth/roles";

function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

export function isEventAdminEmail(env: CloudflareEnv, email: string): boolean {
  return Boolean(env.EVENT_ADMIN_EMAIL && normalizeEmail(env.EVENT_ADMIN_EMAIL) === normalizeEmail(email));
}

async function claimMigratedEvents(env:CloudflareEnv,userId:string):Promise<void> {
  const assertion=crypto.randomUUID();
  await env.DB.batch([
    env.DB.prepare(`INSERT INTO event_write_assertions(id,passed)
      SELECT ?1,CASE WHEN EXISTS(SELECT 1 FROM auth_users u JOIN user_roles r ON r.user_id=u.id AND r.role='admin'
        WHERE u.id=?2 AND u.emailVerified=1 AND lower(u.email)=?3) THEN 1 ELSE 0 END`).bind(assertion,userId,env.EVENT_ADMIN_EMAIL!.trim().toLowerCase()),
    env.DB.prepare(`INSERT INTO audit_logs(id,actor_user_id,action,resource_type,metadata_json)
      SELECT ?1,?2,'event.migration.claimed','event_migration',
        json_object('previousOwner','event-migration-system','eventIds',json_group_array(c.id),'revisionAuthorsPreserved',json('true'))
      FROM content_entries c JOIN event_migration_records r ON r.event_id=c.id
      WHERE c.created_by='event-migration-system' HAVING count(*)>0`).bind(crypto.randomUUID(),userId),
    env.DB.prepare(`UPDATE content_entries SET created_by=?1,
      updated_by=CASE WHEN updated_by='event-migration-system' THEN ?1 ELSE updated_by END,
      published_by=CASE WHEN published_by='event-migration-system' THEN ?1 ELSE published_by END
      WHERE created_by='event-migration-system' AND id IN(SELECT event_id FROM event_migration_records)`).bind(userId),
    env.DB.prepare(`UPDATE media_assets SET created_by=?1 WHERE created_by='event-migration-system'
      AND id IN(SELECT poster_media_id FROM event_details WHERE content_id IN(SELECT event_id FROM event_migration_records))`).bind(userId),
    env.DB.prepare("DELETE FROM event_write_assertions WHERE id=?1").bind(assertion),
  ]);
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
    from: env.AUTH_EMAIL_FROM,
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

async function requireInvitation(env: CloudflareEnv, value: string): Promise<string> {
  const email = normalizeEmail(value);
  const isBootstrap = Boolean(
    env.BOOTSTRAP_ADMIN_EMAIL && email === normalizeEmail(env.BOOTSTRAP_ADMIN_EMAIL),
  );
  if (!isBootstrap && !(await activeInvitation(env, email))) {
    throw new APIError("FORBIDDEN", {
      message: "CMI Community 当前仅接受受邀邮箱注册。",
    });
  }
  return email;
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
  const role: Role = isBootstrap || isEventAdminEmail(env, email) ? "admin" : invitation?.role ?? "member";
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
  // Authentication emails must complete before the endpoint reports success.
  // Keep the context argument for existing callers; do not detach delivery.
  void ctx;
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
    plugins: [emailOTP({
      otpLength: 6,
      expiresIn: 300,
      allowedAttempts: 3,
      storeOTP: "hashed",
      // The before hook restricts registration to the sole configured admin.
      disableSignUp: false,
      sendVerificationOTP: async ({ email, otp, type }) => {
        if (type !== "sign-in" || !isEventAdminEmail(env, email)) {
          throw new APIError("FORBIDDEN", { message: "此邮箱没有活动管理权限。" });
        }
        if (!env.RESEND_API_KEY) {
          throw new APIError("SERVICE_UNAVAILABLE", { message: "验证码邮件服务尚未配置。" });
        }
        await deliverAuthEmail(env, {
          to: normalizeEmail(email), subject: "CMI 活动管理登录验证码",
          html: `<p>你的验证码为 <strong>${otp}</strong>，5 分钟内有效，只能使用一次。</p>`,
        });
      },
    })],
    hooks: {
      before: createAuthMiddleware(async (context) => {
        // Better Auth 1.7 wraps database-hook rejections on public signup.
        if (context.path === "/sign-up/email" && typeof context.body?.email === "string") {
          await requireInvitation(env, context.body.email);
        }
        if (!context.path.includes("email-otp")) return;
        const allowed = ["/email-otp/send-verification-otp", "/sign-in/email-otp"];
        if (!allowed.includes(context.path) || !isEventAdminEmail(env, String(context.body?.email ?? ""))) {
          throw new APIError("FORBIDDEN", { message: "此邮箱没有活动管理权限。" });
        }
        if (context.path === "/email-otp/send-verification-otp") {
          if (context.body?.type !== "sign-in") {
            throw new APIError("FORBIDDEN", { message: "此入口仅用于活动管理员登录。" });
          }
          if (!env.RESEND_API_KEY) throw new APIError("SERVICE_UNAVAILABLE", { message: "验证码邮件服务尚未配置。" });
          const now = Date.now();
          const ip = context.headers?.get("cf-connecting-ip") ?? "local";
          const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(ip));
          const ipKey = Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
          for (const key of ["event-admin-email", `event-admin-ip:${ipKey}`]) {
            const result = await env.DB.prepare(
              `INSERT INTO event_otp_send_limits(rate_key,sent_at) VALUES(?1,?2)
               ON CONFLICT(rate_key) DO UPDATE SET sent_at=excluded.sent_at
               WHERE event_otp_send_limits.sent_at <= ?2 - 60000 RETURNING rate_key`,
            ).bind(key, now).first();
            if (!result) throw new APIError("TOO_MANY_REQUESTS", { message: "请等待 60 秒后再发送验证码。" });
          }
        }
      }),
      after: createAuthMiddleware(async (context) => {
        const session = context.context.newSession;
        if (context.path !== "/sign-in/email-otp" || !session || !isEventAdminEmail(env, session.user.email)) return;
        // Better Auth may defer database after-hooks until the request transaction
        // finishes. First-time OTP users need their verified role before claiming.
        await provisionVerifiedIdentity(env,session.user.id);
        await claimMigratedEvents(env,session.user.id);
        await env.DB.prepare(
          `INSERT INTO event_admin_otp_sessions(session_id,verified_at) VALUES(?1,?2)
           ON CONFLICT(session_id) DO NOTHING`,
        ).bind(session.session.id, new Date().toISOString()).run();
      }),
    },
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
          before: async (user, context) => {
            const email = normalizeEmail(user.email);
            if (context?.path !== "/sign-in/email-otp" || !isEventAdminEmail(env, email)) {
              await requireInvitation(env, email);
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
    },
  });
}
