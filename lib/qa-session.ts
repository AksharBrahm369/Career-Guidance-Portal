import "server-only";
import { randomBytes } from "node:crypto";
import { cookies } from "next/headers";

const COOKIE_NAME = "qa_sid";
const MAX_AGE = 60 * 60 * 8;

export async function getOrCreateQASessionId(): Promise<{ id: string; isNew: boolean }> {
  const jar = await cookies();
  const existing = jar.get(COOKIE_NAME)?.value;
  if (existing && /^[a-f0-9]{32}$/.test(existing)) {
    return { id: existing, isNew: false };
  }
  const id = randomBytes(16).toString("hex");
  jar.set(COOKIE_NAME, id, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE,
  });
  return { id, isNew: true };
}

export function qaSessionKey(courseId: string, sessionId: string): string {
  return `qa:${courseId}:${sessionId}`;
}
