import { eq } from "drizzle-orm";
import { adminErrorResponse, requireAdmin } from "@/lib/auth/require-admin";
import { courseLearningResources } from "@/db/schema";
import { db } from "@/lib/db";
import { logAudit } from "@/lib/audit";
import {
  deleteLearningResource,
  LearningResourcePatchBody,
  updateLearningResource,
  verifyLearningResourceUrl,
} from "@/lib/admin/learning-resources";

export const runtime = "nodejs";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  let admin;
  try {
    admin = await requireAdmin();
  } catch (err) {
    return adminErrorResponse(err) ?? Response.json({ error: "internal" }, { status: 500 });
  }

  const { id } = await params;
  const existing = await db.query.courseLearningResources.findFirst({
    where: eq(courseLearningResources.id, id),
  });
  if (!existing) return Response.json({ error: "not_found" }, { status: 404 });

  let body;
  try {
    body = LearningResourcePatchBody.parse(await req.json());
  } catch (err) {
    return Response.json({ error: "invalid_body", detail: String(err) }, { status: 400 });
  }

  if (body.url && body.url !== existing.url) {
    const verification = await verifyLearningResourceUrl(body.url);
    if (!verification.ok) {
      return Response.json({ error: "dead_url", message: verification.warning }, { status: 422 });
    }
  }

  const resource = await updateLearningResource(id, body);
  if (!resource) return Response.json({ error: "not_found" }, { status: 404 });

  await logAudit({
    adminId: admin.adminId,
    action: "update",
    entityType: "course_learning_resource",
    entityId: id,
    oldValues: pickChanged(existing, body),
    newValues: pickChanged(resource, body),
    ip: req.headers.get("x-forwarded-for"),
    userAgent: req.headers.get("user-agent"),
  });

  return Response.json({ resource });
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  let admin;
  try {
    admin = await requireAdmin();
  } catch (err) {
    return adminErrorResponse(err) ?? Response.json({ error: "internal" }, { status: 500 });
  }

  const { id } = await params;
  const existing = await db.query.courseLearningResources.findFirst({
    where: eq(courseLearningResources.id, id),
  });
  if (!existing) return Response.json({ error: "not_found" }, { status: 404 });

  await deleteLearningResource(id);

  await logAudit({
    adminId: admin.adminId,
    action: "delete",
    entityType: "course_learning_resource",
    entityId: id,
    oldValues: {
      courseId: existing.courseId,
      title: existing.title,
      url: existing.url,
      status: existing.status,
    },
    ip: req.headers.get("x-forwarded-for"),
    userAgent: req.headers.get("user-agent"),
  });

  return Response.json({ ok: true });
}

function pickChanged<T extends Record<string, unknown>>(
  row: T | undefined,
  changes: Record<string, unknown>,
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  if (!row) return out;
  for (const k of Object.keys(changes)) {
    out[k] = (row as Record<string, unknown>)[k];
  }
  return out;
}
