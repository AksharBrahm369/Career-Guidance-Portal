import { describe, expect, it } from "vitest";
import { hashPassword, verifyPassword } from "@/lib/auth/password";

describe("password (scrypt)", () => {
  it("round-trips a hash and verifies the same password", async () => {
    const hash = await hashPassword("correct horse battery staple");
    expect(hash.startsWith("scrypt$")).toBe(true);
    expect(await verifyPassword(hash, "correct horse battery staple")).toBe(true);
  });

  it("rejects the wrong password", async () => {
    const hash = await hashPassword("hunter2");
    expect(await verifyPassword(hash, "Hunter2")).toBe(false);
    expect(await verifyPassword(hash, "")).toBe(false);
  });

  it("produces unique salts so hashes of the same password differ", async () => {
    const a = await hashPassword("pw");
    const b = await hashPassword("pw");
    expect(a).not.toEqual(b);
    expect(await verifyPassword(a, "pw")).toBe(true);
    expect(await verifyPassword(b, "pw")).toBe(true);
  });

  it("rejects malformed stored hashes without throwing", async () => {
    expect(await verifyPassword("not-a-hash", "x")).toBe(false);
    expect(await verifyPassword("scrypt$bad$ZZ$ZZ", "x")).toBe(false);
    expect(await verifyPassword("argon2$N=1024,r=8,p=1$ZZ$ZZ", "x")).toBe(false);
  });
});
