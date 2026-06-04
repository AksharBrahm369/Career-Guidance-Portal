import { describe, expect, it } from "vitest";
import { StudentSignupInput, StudentLoginInput } from "@/lib/auth/student-credentials";

describe("StudentSignupInput", () => {
  it("accepts email signup", () => {
    expect(StudentSignupInput.safeParse({ name: "Asha", email: "a@b.com", grade: 11, password: "longenough12" }).success).toBe(true);
  });
  it("accepts phone signup", () => {
    expect(StudentSignupInput.safeParse({ name: "Asha", phone: "9876543210", grade: 12, password: "longenough12" }).success).toBe(true);
  });
  it("rejects when neither email nor phone given", () => {
    expect(StudentSignupInput.safeParse({ name: "Asha", grade: 11, password: "longenough12" }).success).toBe(false);
  });
  it("rejects a short password", () => {
    expect(StudentSignupInput.safeParse({ name: "Asha", email: "a@b.com", grade: 11, password: "short" }).success).toBe(false);
  });
  it("rejects out-of-range grade", () => {
    expect(StudentSignupInput.safeParse({ name: "Asha", email: "a@b.com", grade: 8, password: "longenough12" }).success).toBe(false);
  });
});

describe("StudentLoginInput", () => {
  it("requires identifier + password", () => {
    expect(StudentLoginInput.safeParse({ identifier: "a@b.com", password: "x" }).success).toBe(true);
    expect(StudentLoginInput.safeParse({ identifier: "", password: "x" }).success).toBe(false);
  });
});
