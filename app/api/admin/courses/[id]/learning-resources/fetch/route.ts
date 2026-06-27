import { adminErrorResponse, requireAdmin } from "@/lib/auth/require-admin";
import { logAudit } from "@/lib/audit";
import { createLearningResources, getCourseForResourceFetch } from "@/lib/admin/learning-resources";
import { fetchLearningResourceDrafts } from "@/lib/ai/learning-resources";
import { consume } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const maxDuration = 120;

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  let admin;
  try {
    admin = await requireAdmin();
  } catch (err) {
    return adminErrorResponse(err) ?? Response.json({ error: "internal" }, { status: 500 });
  }

  const limit = consume(`learning-resources:${admin.adminId}`, {
    capacity: 30,
    refillPerSecond: 30 / 60,
  });
  if (!limit.ok) {
    return Response.json(
      { error: "rate_limited", retryAfterSeconds: limit.retryAfterSeconds },
      { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds) } },
    );
  }

  const { id } = await params;
  const course = await getCourseForResourceFetch(id);
  if (!course) return Response.json({ error: "not_found" }, { status: 404 });

  const {
    resources: drafts,
    warnings,
    provider,
  } = await fetchLearningResourceDrafts({
    courseName: course.courseName,
    stream: course.stream,
    careerClusters: course.careerClusters,
    description: course.description,
  });

  if (drafts.length === 0) {
    return Response.json(
      {
        error: "no_resources",
        message: "No verifiable learning resource URLs were found.",
        warnings,
      },
      { status: 502 },
    );
  }

  const resources = await createLearningResources(id, drafts);

  await logAudit({
    adminId: admin.adminId,
    action: "ai_fetch",
    entityType: "course_learning_resource",
    entityId: id,
    newValues: {
      courseId: id,
      provider,
      count: resources.length,
      urls: resources.map((resource) => resource.url),
    },
    ip: req.headers.get("x-forwarded-for"),
    userAgent: req.headers.get("user-agent"),
  });

  return Response.json({ resources, warnings, provider });
}
