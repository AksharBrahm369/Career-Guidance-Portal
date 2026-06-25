import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { z } from "zod";

import { adminUsernameToAuthEmail } from "@/lib/admin/admin-username";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { user } from "@/db/schema";

export const runtime = "nodejs";

const AdminLoginInput = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
});

function requestOrigin(req: Request): string {
  return new URL(req.url).origin;
}

function isSameOriginRequest(req: Request): boolean {
  const origin = req.headers.get("origin");
  if (!origin || origin === "null") return true;
  return origin === requestOrigin(req);
}

function appendSetCookie(response: NextResponse, source: Response) {
  const setCookies =
    (source.headers as Headers & { getSetCookie?: () => string[] }).getSetCookie?.() ?? [];

  if (setCookies.length > 0) {
    for (const cookie of setCookies) response.headers.append("set-cookie", cookie);
    return;
  }

  source.headers.forEach((value, key) => {
    if (key.toLowerCase() === "set-cookie") response.headers.append("set-cookie", value);
  });
}

function invalidCredentials(status = 401) {
  return Response.json(
    { code: "INVALID_ADMIN_CREDENTIALS", message: "Invalid admin credentials" },
    { status },
  );
}

export async function POST(req: Request) {
  if (env.NODE_ENV === "production" && !isSameOriginRequest(req)) {
    return Response.json({ code: "INVALID_ORIGIN", message: "Invalid origin" }, { status: 403 });
  }

  let input: z.infer<typeof AdminLoginInput>;
  try {
    input = AdminLoginInput.parse(await req.json());
  } catch {
    return invalidCredentials(400);
  }

  const email = adminUsernameToAuthEmail(input.username);
  const row = await db.query.user.findFirst({
    where: eq(user.email, email),
    columns: { role: true },
  });
  if (row?.role !== "admin") return invalidCredentials();

  const origin = requestOrigin(req);
  const authHeaders = new Headers(req.headers);
  authHeaders.set("origin", origin);
  authHeaders.set("referer", `${origin}/admin/login`);

  const signInResponse = await auth.api.signInEmail({
    body: { email, password: input.password },
    headers: authHeaders,
    asResponse: true,
  } as Parameters<typeof auth.api.signInEmail>[0] & { asResponse: true });

  if (!signInResponse.ok) return invalidCredentials(signInResponse.status);

  const response = NextResponse.json({ ok: true });
  appendSetCookie(response, signInResponse);
  return response;
}
