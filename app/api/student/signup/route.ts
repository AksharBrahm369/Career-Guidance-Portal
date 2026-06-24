import { z } from "zod";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { user } from "@/db/schema";
import { normalizePhone, synthEmailFromPhone } from "@/lib/phone";

export const runtime = "nodejs";

const StudentSignupInput = z.object({
  name: z.string().min(1),
  phone: z.string().min(6),
  password: z.string().min(8),
});

/** Postgres unique-violation SQLSTATE — set on the typed pg error. */
function isUniqueViolation(err: unknown): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    "code" in err &&
    (err as { code?: string }).code === "23505"
  );
}

export async function POST(req: Request) {
  let input: z.infer<typeof StudentSignupInput>;
  try {
    input = StudentSignupInput.parse(await req.json());
  } catch (err) {
    return Response.json({ error: "invalid_body", detail: String(err) }, { status: 400 });
  }

  // Canonical phone — the SAME normalized value feeds both the synth email and
  // the stored `phoneNumber`, so signup and login agree on the identifier.
  const phone = normalizePhone(input.phone);
  if (!phone) {
    return Response.json({ error: "invalid_body", detail: "phone" }, { status: 400 });
  }
  const synthEmail = synthEmailFromPhone(input.phone);

  let createdUserId: string | null = null;
  try {
    const created = await auth.api.signUpEmail({
      body: { email: synthEmail, password: input.password, name: input.name },
    });
    createdUserId = created.user.id;

    // Set the real phone identifier + role on the new row. The admin plugin's
    // defaultRole is "student", but we set it explicitly so a fresh row is never
    // left with role=null (which requireStudent() would reject). phoneNumberVerified
    // stays false — v1 has no OTP, so we cannot prove ownership of this number.
    await db
      .update(user)
      .set({ phoneNumber: phone, phoneNumberVerified: false, role: "student" })
      .where(eq(user.id, createdUserId));

    const authHeaders = new Headers(req.headers);
    if (!authHeaders.has("origin")) authHeaders.set("origin", new URL(req.url).origin);

    const signInResponse = await auth.api.signInPhoneNumber({
      body: { phoneNumber: phone, password: input.password },
      headers: authHeaders,
      asResponse: true,
    } as Parameters<typeof auth.api.signInPhoneNumber>[0] & { asResponse: true });

    const response = NextResponse.json({ ok: true }, { status: 201 });
    const setCookies =
      (signInResponse.headers as Headers & { getSetCookie?: () => string[] }).getSetCookie?.() ??
      [];

    if (setCookies.length > 0) {
      for (const cookie of setCookies) response.headers.append("set-cookie", cookie);
    } else {
      signInResponse.headers.forEach((value, key) => {
        if (key.toLowerCase() === "set-cookie") response.headers.append("set-cookie", value);
      });
    }

    return response;
  } catch (err) {
    // Duplicate phone OR synth email → structural unique-violation (pg 23505),
    // not brittle message matching. The synth-email collision surfaces from
    // signUpEmail; the phone collision from the db.update above.
    if (isUniqueViolation(err)) {
      // If signUpEmail succeeded but the phone update hit a duplicate phone,
      // the just-created user has no phone and can never log in — delete it so
      // no orphan row is left behind.
      if (createdUserId) {
        await db
          .delete(user)
          .where(eq(user.id, createdUserId))
          .catch(() => {});
      }
      return Response.json({ error: "already_registered" }, { status: 409 });
    }

    // Better Auth surfaces its own "already exists" as an APIError before the DB
    // is touched; treat those as duplicates too without leaking the message.
    const message = err instanceof Error ? err.message : "";
    if (/exist|already registered|already in use/i.test(message)) {
      if (createdUserId) {
        await db
          .delete(user)
          .where(eq(user.id, createdUserId))
          .catch(() => {});
      }
      return Response.json({ error: "already_registered" }, { status: 409 });
    }

    // Unexpected failure: log server-side, return a generic error (never the
    // raw internal message — it can leak stack/DB details and aid enumeration).
    console.error("[student/signup] unexpected failure:", err);
    if (createdUserId) {
      // Compensating delete so a half-built (no-phone) account isn't orphaned.
      await db
        .delete(user)
        .where(eq(user.id, createdUserId))
        .catch(() => {});
    }
    return Response.json({ error: "signup_failed" }, { status: 500 });
  }
}
