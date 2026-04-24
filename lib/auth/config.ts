import { DrizzleAdapter } from "@auth/drizzle-adapter";
import { eq } from "drizzle-orm";
import type { NextAuthConfig } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { z } from "zod";
import { db } from "@/lib/db";
import { accounts, admins, sessions, users, verificationTokens } from "@/db/schema";
import { authConfigBase } from "./config.base";
import { verifyPassword } from "./password";

const CredsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const authConfig: NextAuthConfig = {
  ...authConfigBase,
  adapter: DrizzleAdapter(db, {
    usersTable: users,
    accountsTable: accounts,
    sessionsTable: sessions,
    verificationTokensTable: verificationTokens,
  }),
  providers: [
    Credentials({
      name: "Admin",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(raw) {
        const parsed = CredsSchema.safeParse(raw);
        if (!parsed.success) return null;

        const { email, password } = parsed.data;
        const admin = await db.query.admins.findFirst({
          where: eq(admins.email, email.toLowerCase()),
        });
        if (!admin) return null;

        const ok = await verifyPassword(admin.passwordHash, password);
        if (!ok) return null;

        await db
          .update(admins)
          .set({ lastLoginAt: new Date() })
          .where(eq(admins.id, admin.id));

        return {
          id: admin.id,
          email: admin.email,
          name: admin.name,
          role: "admin" as const,
          adminId: admin.id,
        };
      },
    }),
    // TODO: add student provider (OTP/magic link) in M4
  ],
};
