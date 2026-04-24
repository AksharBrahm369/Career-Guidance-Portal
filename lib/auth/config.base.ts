import type { NextAuthConfig } from "next-auth";

// Edge-safe config: no DB adapter, no Node-only deps (argon2, pg).
// Used by middleware.ts via `lib/auth/edge.ts`.
export const authConfigBase: NextAuthConfig = {
  session: {
    strategy: "jwt",
    maxAge: 8 * 60 * 60, // 8 hours (spec minimum)
  },
  pages: {
    signIn: "/admin/login",
  },
  providers: [],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = (user as { role?: string }).role ?? "admin";
        token.adminId = (user as { adminId?: string }).adminId;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as unknown as Record<string, unknown>).role = token.role;
        (session.user as unknown as Record<string, unknown>).adminId = token.adminId;
      }
      return session;
    },
  },
};
