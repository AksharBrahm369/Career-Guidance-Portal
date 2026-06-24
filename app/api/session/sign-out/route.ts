import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { session } from "@/db/schema/auth";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

const AUTH_COOKIE_NAMES = [
  "better-auth.session_token",
  "__Secure-better-auth.session_token",
  "better-auth-session_token",
  "__Secure-better-auth-session_token",
  "better-auth.session_data",
  "__Secure-better-auth.session_data",
  "better-auth-session_data",
  "__Secure-better-auth-session_data",
  "better-auth.dont_remember",
  "__Secure-better-auth.dont_remember",
  "better-auth-dont_remember",
  "__Secure-better-auth-dont_remember",
];

export async function POST() {
  const response = NextResponse.json({ success: true });

  try {
    const current = await auth.api.getSession({ headers: await headers() });
    if (current?.session.token) {
      await db.delete(session).where(eq(session.token, current.session.token));
    }
  } catch (err) {
    console.error("[session/sign-out] Session cleanup failed:", err);
  }

  for (const name of AUTH_COOKIE_NAMES) {
    response.cookies.set(name, "", {
      path: "/",
      maxAge: 0,
      expires: new Date(0),
      sameSite: "lax",
    });
  }

  return response;
}
