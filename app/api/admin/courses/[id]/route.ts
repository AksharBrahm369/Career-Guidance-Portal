import { eq } from "drizzle-orm";
import { z } from "zod";
import { adminErrorResponse, requireAdmin } from "@/lib/auth/require-admin";
import { db } from "@/lib/db";
import { courseInstitutes, courses } from "@/db/schema";
import { logAudit } from "@/lib/audit";

export const runtime = "nodejs";

const PatchBody = z
  .object({
    courseName: z.string().min(1).max(200).optional(),
    courseCode: z.string().max(40).nullable().optional(),
    stream: z.enum(["science", "commerce", "arts", "vocational"]).optional(),
    careerClusters: z.array(z.string()).min(1).max(8).optional(),
    aiSafetyTag: z.enum(["ai_safe", "ai_augmented", "ai_risk"]).optional(),
    aiSafetyReasoning: z.string().min(1).max(2000).nullable().optional(),
    description: z.string().min(150).optional(),
    tenureYears: z.number().positive().optional(),
    eligibilityCriteria: z.string().min(1).optional(),
    entranceExams: z.array(z.string()).max(8).optional(),
    feesMinInr: z.number().nonnegative().nullable().optional(),
    feesMaxInr: z.number().nonnegative().nullable().optional(),
    sourceUrls: z.array(z.string().url()).max(8).optional(),
  })
  .refine((d) => Object.keys(d).length > 0, { message: "no fields to update" });

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin();
  } catch (err) {
    return adminErrorResponse(err) ?? Response.json({ error: "internal" }, { status: 500 });
  }
  const { id } = await params;

  const course = await db.query.courses.findFirst({ where: eq(courses.id, id) });
  if (!course) return Response.json({ error: "not_found" }, { status: 404 });

  const links = await db
    .select({ instituteId: courseInstitutes.instituteId })
    .from(courseInstitutes)
    .where(eq(courseInstitutes.courseId, id));
  const ids = links.map((l) => l.instituteId);
  const linkedInstitutes = ids.length
    ? await db.query.institutes.findMany({ where: (t, { inArray }) => inArray(t.id, ids) })
    : [];

  return Response.json({ course, institutes: linkedInstitutes });
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  let admin;
  try {
    admin = await requireAdmin();
  } catch (err) {
    return adminErrorResponse(err) ?? Response.json({ error: "internal" }, { status: 500 });
  }
  const { id } = await params;

  let body;
  try {
    body = PatchBody.parse(await req.json());
  } catch (err) {
    return Response.json({ error: "invalid_body", detail: String(err) }, { status: 400 });
  }

  const existing = await db.query.courses.findFirst({ where: eq(courses.id, id) });
  if (!existing) return Response.json({ error: "not_found" }, { status: 404 });

  const update: Record<string, unknown> = {
    lastEditedByAdminId: admin.adminId,
    updatedAt: new Date(),
  };
  if (body.courseName !== undefined) update.courseName = body.courseName;
  if (body.courseCode !== undefined) update.courseCode = body.courseCode;
  if (body.stream !== undefined) update.stream = body.stream;
  if (body.careerClusters !== undefined) update.careerClusters = body.careerClusters;
  if (body.aiSafetyTag !== undefined) update.aiSafetyTag = body.aiSafetyTag;
  if (body.aiSafetyReasoning !== undefined) update.aiSafetyReasoning = body.aiSafetyReasoning;
  if (body.description !== undefined) update.description = body.description;
  if (body.tenureYears !== undefined) update.tenureYears = String(body.tenureYears);
  if (body.eligibilityCriteria !== undefined) update.eligibilityCriteria = body.eligibilityCriteria;
  if (body.entranceExams !== undefined) update.entranceExams = body.entranceExams;
  if (body.feesMinInr !== undefined)
    update.feesMinInr = body.feesMinInr == null ? null : String(body.feesMinInr);
  if (body.feesMaxInr !== undefined)
    update.feesMaxInr = body.feesMaxInr == null ? null : String(body.feesMaxInr);
  if (body.sourceUrls !== undefined) update.sourceUrls = body.sourceUrls;

  const [updated] = await db
    .update(courses)
    .set(update)
    .where(eq(courses.id, id))
    .returning();

  await logAudit({
    adminId: admin.adminId,
    action: "update",
    entityType: "course",
    entityId: id,
    oldValues: pickChanged(existing, body),
    newValues: pickChanged(updated, body),
    ip: req.headers.get("x-forwarded-for"),
    userAgent: req.headers.get("user-agent"),
  });

  return Response.json({ course: updated });
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
