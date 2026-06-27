import { eq } from "drizzle-orm";
import { adminErrorResponse, requireAdmin } from "@/lib/auth/require-admin";
import { db } from "@/lib/db";
import { courses } from "@/db/schema";
import { logAudit } from "@/lib/audit";
import {
  createLearningResource,
  LearningResourceBody,
  listLearningResourcesForCourse,
  verifyLearningResourceUrl,
} from "@/lib/admin/learning-resources";

export const runtime = "nodejs";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin();
  } catch (err) {
    return adminErrorResponse(err) ?? Response.json({ error: "internal" }, { status: 500 });
  }

  const { id } = await params;
  const course = await db.query.courses.findFirst({ where: eq(courses.id, id) });
  if (!course) return Response.json({ error: "not_found" }, { status: 404 });

  const resources = await listLearningResourcesForCourse(id);
  return Response.json({ course: { id: course.id, courseName: course.courseName }, resources });
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  let admin;
  try {
    admin = await requireAdmin();
  } catch (err) {
    return adminErrorResponse(err) ?? Response.json({ error: "internal" }, { status: 500 });
  }

  const { id } = await params;
  const course = await db.query.courses.findFirst({ where: eq(courses.id, id) });
  if (!course) return Response.json({ error: "not_found" }, { status: 404 });

  let body;
  try {
    body = LearningResourceBody.parse(await req.json());
  } catch (err) {
    return Response.json({ error: "invalid_body", detail: String(err) }, { status: 400 });
  }

  const verification = await verifyLearningResourceUrl(body.url);
  if (!verification.ok) {
    return Response.json({ error: "dead_url", message: verification.warning }, { status: 422 });
  }

  const resource = await createLearningResource(id, {
    ...body,
    status: "draft",
    source: "manual",
  });

  await logAudit({
    adminId: admin.adminId,
    action: "create",
    entityType: "course_learning_resource",
    entityId: resource.id,
    newValues: { courseId: id, title: resource.title, url: resource.url },
    ip: req.headers.get("x-forwarded-for"),
    userAgent: req.headers.get("user-agent"),
  });

  return Response.json({ resource, warning: verification.warning }, { status: 201 });
}
