import { StudentSignupInput, createStudent } from "@/lib/auth/student-credentials";
import { db } from "@/lib/db";
import { students } from "@/db/schema";
import { eq, or } from "drizzle-orm";

export const runtime = "nodejs";

export async function POST(req: Request) {
  let input;
  try {
    input = StudentSignupInput.parse(await req.json());
  } catch (err) {
    return Response.json({ error: "invalid_body", detail: String(err) }, { status: 400 });
  }
  const existing = await db.query.students.findFirst({
    where: or(
      input.email ? eq(students.email, input.email.toLowerCase()) : undefined,
      input.phone ? eq(students.phone, input.phone) : undefined,
    ),
  });
  if (existing) {
    return Response.json({ error: "already_registered" }, { status: 409 });
  }
  try {
    const { id } = await createStudent(input);
    return Response.json({ id }, { status: 201 });
  } catch (err) {
    return Response.json({ error: "signup_failed", message: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}
