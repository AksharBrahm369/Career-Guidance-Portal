import { eq } from "drizzle-orm";
import { adminErrorResponse, requireAdmin } from "@/lib/auth/require-admin";
import { db } from "@/lib/db";
import { courses } from "@/db/schema";
import { verifyUrls } from "@/lib/url-verify";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin();
  } catch (err) {
    return adminErrorResponse(err) ?? Response.json({ error: "internal" }, { status: 500 });
  }
  const { id } = await params;

  const course = await db.query.courses.findFirst({
    where: eq(courses.id, id),
    columns: { id: true, sourceUrls: true },
  });
  if (!course) return Response.json({ error: "not_found" }, { status: 404 });

  const verification = await verifyUrls(course.sourceUrls);
  return Response.json({
    ok: verification.ok,
    dead: verification.dead,
    unknown: verification.unknown,
    results: verification.results,
  });
}
