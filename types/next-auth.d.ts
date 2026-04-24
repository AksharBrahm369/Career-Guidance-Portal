import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: DefaultSession["user"] & {
      role?: "admin" | "student";
      adminId?: string;
    };
  }

  interface User {
    role?: "admin" | "student";
    adminId?: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role?: "admin" | "student";
    adminId?: string;
  }
}
