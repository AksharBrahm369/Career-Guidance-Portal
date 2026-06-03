import { eq } from "drizzle-orm";
import { adminErrorResponse, requireAdmin } from "@/lib/auth/require-admin";
import { db } from "@/lib/db";
import { careerClusters } from "@/db/schema";
import { logAudit } from "@/lib/audit";
import { ClusterDefinition } from "@/lib/admin/clusters/cluster-schema";

export const runtime = "nodejs";

const PartialCluster = ClusterDefinition.partial().refine(
  (d) => Object.keys(d).length > 0,
  { message: "no fields to update" },
);

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
    body = PartialCluster.parse(await req.json());
  } catch (err) {
    return Response.json({ error: "invalid_body", detail: String(err) }, { status: 400 });
  }
  await db.update(careerClusters).set({ ...body, updatedAt: new Date() }).where(eq(careerClusters.id, id));
  await logAudit({ adminId: admin.adminId, action: "update", entityType: "career_cluster", entityId: id, newValues: body });
  return Response.json({ ok: true });
}
