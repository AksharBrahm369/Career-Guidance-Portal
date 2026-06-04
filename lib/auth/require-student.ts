import "server-only";
import { auth } from "@/lib/auth";

export interface StudentSession { studentId: string; name: string; }

export class StudentUnauthorizedError extends Error {
  constructor() { super("Student authentication required"); this.name = "StudentUnauthorizedError"; }
}

export async function requireStudent(): Promise<StudentSession> {
  const session = await auth();
  const role = (session?.user as { role?: string } | undefined)?.role;
  const studentId = (session?.user as { studentId?: string } | undefined)?.studentId;
  if (!session || role !== "student" || !studentId) throw new StudentUnauthorizedError();
  return { studentId, name: session.user!.name ?? "" };
}

export function studentErrorResponse(err: unknown): Response | null {
  if (err instanceof StudentUnauthorizedError) return Response.json({ error: "unauthorized" }, { status: 401 });
  return null;
}
