import { z } from "zod";
import { adminErrorResponse, requireAdmin } from "@/lib/auth/require-admin";
import { FetchFailedError, safeFetchCourseBatch } from "@/lib/ai/safe-fetch";
import {
  getExistingCourseNames,
  persistFetchedCourse,
} from "@/lib/admin/persist-fetched-course";
import { consume } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const maxDuration = 300;

const Body = z.object({
  query: z.string().min(2).max(200),
  override: z.boolean().default(false),
});

export async function POST(req: Request) {
  let admin;
  try {
    admin = await requireAdmin();
  } catch (err) {
    return adminErrorResponse(err) ?? Response.json({ error: "internal" }, { status: 500 });
  }

  // Consume one token per course requested so bulk fetches are properly rate-limited.
  const body_raw = await req.json().catch(() => null);
  let body;
  try {
    body = Body.parse(body_raw);
  } catch (err) {
    return Response.json({ error: "invalid_body", detail: String(err) }, { status: 400 });
  }

  const limit = consume(`fetch:${admin.adminId}`, {
    capacity: 20,
    refillPerSecond: 20 / 60,
  });
  if (!limit.ok) {
    return Response.json(
      { error: "rate_limited", retryAfterSeconds: limit.retryAfterSeconds },
      { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds) } },
    );
  }

  const excludeNames = body.override ? [] : await getExistingCourseNames();

  const ip = req.headers.get("x-forwarded-for") ?? req.headers.get("x-real-ip") ?? null;
  const userAgent = req.headers.get("user-agent") ?? null;

  try {
    const { results, failures } = await safeFetchCourseBatch({
      query: body.query,
      excludeNames,
    });

    if (results.length === 0) {
      return Response.json(
        {
          error: "fetch_failed",
          message: "AI provider returned no valid courses.",
          failures,
        },
        { status: 502 },
      );
    }

    const persisted: Array<{
      courseId: string;
      slug: string;
      provider: string;
      warnings: string[];
      course: (typeof results)[number]["course"];
    }> = [];

    for (const r of results) {
      try {
        const p = await persistFetchedCourse(r.course, {
          adminId: admin.adminId,
          source: "ai_fetch",
          ip,
          userAgent,
        });
        persisted.push({
          courseId: p.courseId,
          slug: p.slug,
          provider: r.provider,
          warnings: r.warnings,
          course: r.course,
        });
      } catch (persistErr) {
        console.error("Failed to persist course:", r.course.courseName, persistErr);
        failures.push(
          `Persist failed for "${r.course.courseName}": ${persistErr instanceof Error ? persistErr.message : String(persistErr)}`,
        );
      }
    }

    return Response.json({
      mode: "batch",
      total: persisted.length,
      failures,
      courses: persisted,
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
}
