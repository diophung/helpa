import { betterAuth } from "better-auth";
import { twoFactor } from "better-auth/plugins";
import { fromNodeHeaders } from "better-auth/node";
import type { FastifyRequest } from "fastify";
import type { PgPool } from "../db/index.js";
import type { Config } from "../config.js";
import { can, type Role, type Permission } from "../../shared/permissions.js";
import { AppError } from "../errors.js";

export function createAuth(pool: PgPool, c: Config) {
  return betterAuth({
    appName: "Helpa",
    baseURL: c.PUBLIC_URL,
    secret: c.AUTH_SECRET,
    database: pool,
    trustedOrigins: [c.PUBLIC_URL],
    logger: { disabled: true },
    emailAndPassword: {
      enabled: true,
      minPasswordLength: 12,
      autoSignIn: true,
    },
    session: {
      expiresIn: 60 * 60 * 12,
      updateAge: 60 * 30,
      cookieCache: { enabled: false },
    },
    advanced: {
      useSecureCookies: c.PUBLIC_URL.startsWith("https:"),
      defaultCookieAttributes: { httpOnly: true, sameSite: "lax" },
    },
    rateLimit: { enabled: true, storage: "database", window: 60, max: 30 },
    plugins: [
      twoFactor({
        issuer: "Helpa",
        backupCodeOptions: { storeBackupCodes: "encrypted" },
      }),
    ],
  });
}
export type Auth = ReturnType<typeof createAuth>;
export type Actor = {
  userId: string;
  sessionId: string;
  businessId: string;
  role: Role;
  channelScope: string[];
  name: string;
  email: string;
  mfaRequired: boolean;
  mfaEnrolled: boolean;
  locale: "vi" | "en";
  timezone: string;
};
export async function actorFor(
  auth: Auth,
  pool: PgPool,
  req: FastifyRequest,
  allowPending = false,
): Promise<Actor> {
  const s = await auth.api.getSession({
    headers: fromNodeHeaders(req.headers),
    query: { disableCookieCache: true },
  });
  if (!s) throw new AppError(401, "UNAUTHENTICATED");
  const result = await pool.query(
    `SELECT m.business_id,m.role,m.channel_scope,p.locale,p.timezone,
    EXISTS(SELECT 1 FROM mfa_session WHERE session_id=$2) AS mfa_verified
    FROM membership m LEFT JOIN user_preference p ON p.user_id=m.user_id
    WHERE m.user_id=$1 AND m.revoked_at IS NULL`,
    [s.user.id, s.session.id],
  );
  if (!result.rowCount) throw new AppError(403, "MEMBERSHIP_REVOKED");
  const m = result.rows[0];
  const mfaRequired =
    (m.role === "owner" || m.role === "manager" || !!s.user.twoFactorEnabled) &&
    (!s.user.twoFactorEnabled || !m.mfa_verified);
  if (mfaRequired && !allowPending) throw new AppError(403, "MFA_REQUIRED");
  return {
    userId: s.user.id,
    sessionId: s.session.id,
    businessId: m.business_id,
    role: m.role,
    channelScope: m.channel_scope,
    name: s.user.name,
    email: s.user.email,
    mfaRequired,
    mfaEnrolled: !!s.user.twoFactorEnabled,
    locale: m.locale ?? "vi",
    timezone: m.timezone ?? "Asia/Ho_Chi_Minh",
  };
}
export function requirePermission(
  actor: Actor,
  permission: Permission,
  channel?: string,
) {
  if (!can(actor.role, actor.channelScope, permission, channel))
    throw new AppError(403, "FORBIDDEN");
}
