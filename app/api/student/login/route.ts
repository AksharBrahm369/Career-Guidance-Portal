import { NextResponse } from "next/server";
import { z } from "zod";

import { auth } from "@/lib/auth";
import { env } from "@/lib/env";
import { normalizePhone } from "@/lib/phone";

export const runtime = "nodejs";

const StudentLoginInput = z.object({
  phone: z.string().min(6),
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

export async function POST(req: Request) {
  if (env.NODE_ENV === "production" && !isSameOriginRequest(req)) {
    return Response.json({ code: "INVALID_ORIGIN", message: "Invalid origin" }, { status: 403 });
  }

  let input: z.infer<typeof StudentLoginInput>;
  try {
    input = StudentLoginInput.parse(await req.json());
  } catch (err) {
    return Response.json(
      { code: "INVALID_BODY", message: "Invalid login request", detail: String(err) },
      { status: 400 },
    );
  }

  const phoneNumber = normalizePhone(input.phone);
  if (!phoneNumber) {
    return Response.json(
      { code: "INVALID_PHONE_NUMBER", message: "Invalid phone number" },
      { status: 400 },
    );
  }

  const origin = requestOrigin(req);
  const authHeaders = new Headers(req.headers);
  authHeaders.set("origin", origin);
  authHeaders.set("referer", `${origin}/student/login`);

  const signInResponse = await auth.api.signInPhoneNumber({
    body: { phoneNumber, password: input.password },
    headers: authHeaders,
    asResponse: true,
  } as Parameters<typeof auth.api.signInPhoneNumber>[0] & { asResponse: true });

  if (!signInResponse.ok) {
    const detail = await signInResponse
      .clone()
      .json()
      .catch(() => ({ code: "LOGIN_FAILED", message: "Log in failed" }));
    return Response.json(detail, { status: signInResponse.status });
  }

  const response = NextResponse.json({ ok: true });
  appendSetCookie(response, signInResponse);
  return response;
}
