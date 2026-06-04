import "server-only";
import { eq, or } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { students, type Student } from "@/db/schema";
import { hashPassword, verifyPassword } from "./password";

export const StudentSignupInput = z
  .object({
    name: z.string().min(1).max(120),
    email: z.string().email().optional(),
    phone: z.string().regex(/^[0-9]{10}$/, "10-digit phone").optional(),
    grade: z.number().int().min(9).max(12),
    password: z.string().min(8).max(200),
  })
  .refine((d) => Boolean(d.email || d.phone), { message: "email or phone is required", path: ["email"] });
export type StudentSignupInput = z.infer<typeof StudentSignupInput>;

export const StudentLoginInput = z.object({
  identifier: z.string().min(1),
  password: z.string().min(1),
});

export async function createStudent(input: StudentSignupInput): Promise<{ id: string }> {
  const passwordHash = await hashPassword(input.password);
  const [created] = await db
    .insert(students)
    .values({
      name: input.name,
      email: input.email?.toLowerCase() ?? null,
      phone: input.phone ?? null,
      grade: input.grade,
      passwordHash,
    })
    .returning({ id: students.id });
  if (!created) throw new Error("Failed to create student");
  return { id: created.id };
}

export async function verifyStudentLogin(identifier: string, password: string): Promise<Student | null> {
  const id = identifier.trim().toLowerCase();
  const student = await db.query.students.findFirst({
    where: or(eq(students.email, id), eq(students.phone, identifier.trim())),
  });
  if (!student) return null;
  const ok = await verifyPassword(student.passwordHash, password);
  return ok ? student : null;
}
