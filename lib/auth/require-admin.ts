import "server-only";
import { auth } from "@/lib/auth";

export interface AdminSession {
  adminId: string;
  email: string;
}

export class UnauthorizedError extends Error {
  constructor() {
    super("Admin authentication required");
    this.name = "UnauthorizedError";
  }
}

export async function requireAdmin(): Promise<AdminSession> {
  const session = await auth();
  const role = (session?.user as { role?: string } | undefined)?.role;
  const adminId = (session?.user as { adminId?: string } | undefined)?.adminId;
  if (!session || role !== "admin" || !adminId) throw new UnauthorizedError();
  return { adminId, email: session.user!.email! };
}

export function adminErrorResponse(err: unknown): Response | null {
  if (err instanceof UnauthorizedError) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }
  return null;
}
