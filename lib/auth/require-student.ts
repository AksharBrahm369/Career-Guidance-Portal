import "server-only";
import { getCachedSession } from "@/lib/auth/session";

export interface StudentSession {
  studentId: string;
  name: string;
}

export class StudentUnauthorizedError extends Error {
  constructor() {
    super("Student authentication required");
    this.name = "StudentUnauthorizedError";
  }
}

export async function requireStudent(): Promise<StudentSession> {
  const session = await getCachedSession();
  const role = (session?.user as { role?: string } | undefined)?.role;
  if (!session || role !== "student") throw new StudentUnauthorizedError();
  return { studentId: session.user.id, name: session.user.name ?? "" };
}

export function studentErrorResponse(err: unknown): Response | null {
  if (err instanceof StudentUnauthorizedError) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }
  return null;
}
