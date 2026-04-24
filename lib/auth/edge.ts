import NextAuth from "next-auth";
import { authConfigBase } from "./config.base";

// Edge-safe auth instance for use in middleware.ts only.
export const { auth } = NextAuth(authConfigBase);
