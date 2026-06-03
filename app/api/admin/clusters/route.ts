import { adminErrorResponse, requireAdmin } from "@/lib/auth/require-admin";
import { db } from "@/lib/db";
import { careerClusters } from "@/db/schema";
import { logAudit } from "@/lib/audit";
import { ClusterDefinition } from "@/lib/admin/clusters/cluster-schema";

export const runtime = "nodejs";

export async function GET() {
  try {
    await requireAdmin();
  } catch (err) {
    return adminErrorResponse(err) ?? Response.json({ error: "internal" }, { status: 500 });
  }
  const rows = await db.select().from(careerClusters).orderBy(careerClusters.name);
  return Response.json({ clusters: rows });
}

export async function POST(req: Request) {
  let admin;
  try {
    admin = await requireAdmin();
  } catch (err) {
    return adminErrorResponse(err) ?? Response.json({ error: "internal" }, { status: 500 });
  }
  let body;
  try {
    body = ClusterDefinition.parse(await req.json());
  } catch (err) {
    return Response.json({ error: "invalid_body", detail: String(err) }, { status: 400 });
  }
  const [created] = await db
    .insert(careerClusters)
    .values({
      key: body.key, name: body.name, description: body.description ?? null,
      targetProfile: body.targetProfile, lensWeights: body.lensWeights,
    })
    .returning({ id: careerClusters.id });
  await logAudit({ adminId: admin.adminId, action: "create", entityType: "career_cluster", entityId: created?.id, newValues: { key: body.key } });
  return Response.json({ id: created?.id }, { status: 201 });
}
