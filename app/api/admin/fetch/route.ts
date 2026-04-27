import { z } from "zod";
import { adminErrorResponse, requireAdmin } from "@/lib/auth/require-admin";
import { FetchFailedError, safeFetchCourse } from "@/lib/ai/safe-fetch";
import {
  getExistingCourseNames,
  persistFetchedCourse,
} from "@/lib/admin/persist-fetched-course";

export const runtime = "nodejs";
export const maxDuration = 120;

const Body = z.object({
  query: z.string().min(2).max(200),
  scope: z.enum(["course", "institute", "both"]).default("course"),
  override: z.boolean().default(false),
});

export async function POST(req: Request) {
  let admin;
  try {
    admin = await requireAdmin();
  } catch (err) {
    return adminErrorResponse(err) ?? Response.json({ error: "internal" }, { status: 500 });
  }

  let body;
  try {
    body = Body.parse(await req.json());
  } catch (err) {
    return Response.json({ error: "invalid_body", detail: String(err) }, { status: 400 });
  }

  const excludeNames = body.override ? [] : await getExistingCourseNames();

  let result;
  try {
    result = await safeFetchCourse({
      query: body.query,
      excludeNames,
      scope: body.scope,
    });
  } catch (err) {
    if (err instanceof FetchFailedError) {
      return Response.json({ error: "fetch_failed", message: err.message }, { status: 502 });
    }
    console.error("AI fetch error:", err);
    return Response.json(
      { error: "ai_provider_error", message: err instanceof Error ? err.message : String(err) },
      { status: 502 },
    );
  }

  const ip = req.headers.get("x-forwarded-for") ?? req.headers.get("x-real-ip") ?? null;
  const userAgent = req.headers.get("user-agent") ?? null;

  const persisted = await persistFetchedCourse(result.course, {
    adminId: admin.adminId,
    source: "ai_fetch",
    ip,
    userAgent,
  });

  return Response.json({
    courseId: persisted.courseId,
    slug: persisted.slug,
    provider: result.provider,
    warnings: result.warnings,
    course: result.course,
  });
}
