import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { admin } from "better-auth/plugins/admin";
import { phoneNumber } from "better-auth/plugins/phone-number";
import { nextCookies } from "better-auth/next-js";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import * as authSchema from "@/db/schema/auth";

const isProd = env.NODE_ENV === "production";
const devTrustedOrigins = isProd
  ? []
  : [
      "http://localhost:3000",
      "http://localhost:3001",
      "http://127.0.0.1:3000",
      "http://127.0.0.1:3001",
    ];

// All real front-end origins. baseURL is auto-trusted; this also allow-lists
// Vercel preview URLs via BETTER_AUTH_TRUSTED_ORIGINS (comma-separated env).
const trustedOrigins = Array.from(
  new Set([
    env.BETTER_AUTH_URL,
    ...devTrustedOrigins,
    ...(process.env.BETTER_AUTH_TRUSTED_ORIGINS?.split(",")
      .map((s) => s.trim())
      .filter(Boolean) ?? []),
  ]),
);

// Note: no `import "server-only"` here — the Better Auth CLI loads this file in
// plain Node to generate the schema. It is still effectively server-only (only
// imported by the route handler + server code).
export const auth = betterAuth({
  appName: "Career Box",
  // `schema` is wired in after `npx @better-auth/cli generate` (see db/schema/auth.ts).
  database: drizzleAdapter(db, { provider: "pg", schema: authSchema }),
  baseURL: env.BETTER_AUTH_URL,
  trustedOrigins,
  // Keep UUID ids so assessments.studentId (uuid FK) needs no type change.
  // Secure cookies in production (HTTPS); harmless to keep tied to NODE_ENV.
  advanced: { database: { generateId: "uuid" }, useSecureCookies: isProd },
  emailAndPassword: { enabled: true },
  // Phone+password with no OTP means the sign-in endpoint is the ENTIRE security
  // boundary, so brute-force protection is mandatory. `database` storage so the
  // limiter survives serverless cold starts (in-memory resets per instance and
  // is disabled outside production). Enabled in every environment.
  rateLimit: {
    enabled: true,
    storage: "database",
    customRules: {
      "/sign-in/phone-number": { window: 60, max: 5 },
      "/sign-up/email": { window: 60, max: 3 },
    },
  },
  // Prior NextAuth admin sessions were 8h; the Better Auth default is 7 days.
  // Shorten to 24h overall with a 1h freshAge so sensitive actions require a
  // recent login. cookieCache cuts the per-request DB hit in the guards.
  session: {
    expiresIn: 60 * 60 * 24, // 24 hours
    updateAge: 60 * 60, // refresh once per hour
    freshAge: 60 * 60, // 1 hour
    cookieCache: { enabled: true, maxAge: 60 * 5 }, // 5 minutes
  },
  user: {
    additionalFields: {
      grade: { type: "number", required: false, input: false },
      cooldownOverride: { type: "boolean", required: false, input: false, defaultValue: false },
      lastAssessmentAt: { type: "date", required: false, input: false },
    },
  },
  plugins: [
    // Phone + password for everyone; no SMS/OTP in v1 (sendOTP is a no-op,
    // verification not required).
    //
    // ⚠️ TRUST NOTE: with no OTP, `user.phoneNumber` is attacker-controllable and
    // UNPROVEN. Signup/create-admin write `phoneNumberVerified: false` (honest
    // state). Do NOT treat `phoneNumberVerified` as proof of ownership — any
    // phone-based feature (password reset, notifications, dedup) MUST wait for
    // real OTP before trusting it.
    phoneNumber({ sendOTP: async () => {}, requireVerification: false }),
    admin({ defaultRole: "student", adminRoles: ["admin"] }),
    nextCookies(), // must be last
  ],
});

export type Session = typeof auth.$Infer.Session;
