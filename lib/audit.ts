import "server-only";
import { db } from "@/lib/db";
import { auditLog } from "@/db/schema";

type AuditAction =
  | "create"
  | "update"
  | "publish"
  | "archive"
  | "reject"
  | "login"
  | "ai_fetch";

interface AuditEntry {
  adminId: string | null;
  action: AuditAction;
  entityType: string;
  entityId?: string | null;
  oldValues?: Record<string, unknown> | null;
  newValues?: Record<string, unknown> | null;
  ip?: string | null;
  userAgent?: string | null;
}

export async function logAudit(entry: AuditEntry): Promise<void> {
  await db.insert(auditLog).values({
    adminId: entry.adminId,
    action: entry.action,
    entityType: entry.entityType,
    entityId: entry.entityId ?? null,
    oldValues: entry.oldValues ?? null,
    newValues: entry.newValues ?? null,
    ip: entry.ip ?? null,
    userAgent: entry.userAgent ?? null,
  });
}
