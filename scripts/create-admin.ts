import "./load-env";
import { createInterface } from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";

async function prompt(question: string, { hidden = false } = {}): Promise<string> {
  const rl = createInterface({ input, output, terminal: true });
  if (hidden) {
    const stdout = output as unknown as { _writeToOutput?: (s: string) => void };
    const original = stdout._writeToOutput?.bind(stdout);
    stdout._writeToOutput = (s: string) => {
      if (s.match(/\n/)) original?.(s);
      else original?.("*");
    };
    const answer = await rl.question(question);
    stdout._writeToOutput = original;
    rl.close();
    console.log();
    return answer;
  }
  const answer = await rl.question(question);
  rl.close();
  return answer;
}

async function main() {
  // Imported dynamically AFTER dotenv has loaded — these modules validate env
  // at import time, so they must not be statically hoisted above the env load.
  const { auth } = await import("@/lib/auth");
  const { db } = await import("@/lib/db");
  const { user } = await import("@/db/schema");
  const { eq } = await import("drizzle-orm");
  const { normalizePhone, synthEmailFromPhone } = await import("@/lib/phone");

  const name = (await prompt("Admin name: ")).trim();
  const phone = (await prompt("Admin phone: ")).trim();
  const password = await prompt("Password (min 12 chars): ", { hidden: true });

  if (!name || !phone || !password) {
    console.error("✗ All fields required.");
    process.exit(1);
  }
  if (password.length < 12) {
    console.error("✗ Password must be at least 12 characters.");
    process.exit(1);
  }

  const normalizedPhone = normalizePhone(phone);
  if (!normalizedPhone) {
    console.error("✗ Phone normalizes to empty — enter a valid number.");
    process.exit(1);
  }

  const created = await auth.api.signUpEmail({
    body: { email: synthEmailFromPhone(phone), password, name },
  });

  await db
    .update(user)
    // phoneNumberVerified stays false: v1 has no OTP, so we cannot prove
    // ownership of this number. See lib/auth.ts — do not trust this field.
    .set({ phoneNumber: normalizedPhone, phoneNumberVerified: false, role: "admin" })
    .where(eq(user.id, created.user.id));

  console.log(`✓ Admin created: ${normalizedPhone} (${created.user.id})`);
  process.exit(0);
}

main().catch((err) => {
  console.error("✗ Failed:", err);
  process.exit(1);
});
