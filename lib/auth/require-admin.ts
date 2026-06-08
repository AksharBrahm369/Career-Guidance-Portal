import "server-only";
import { getCachedSession } from "@/lib/auth/session";

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
  const session = await getCachedSession();
  const role = (session?.user as { role?: string } | undefined)?.role;
  if (!session || role !== "admin") throw new UnauthorizedError();
  return { adminId: session.user.id, email: session.user.email };
}

export function adminErrorResponse(err: unknown): Response | null {
  if (err instanceof UnauthorizedError) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }
  return null;
}
