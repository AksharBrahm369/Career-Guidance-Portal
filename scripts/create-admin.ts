import "dotenv/config";
import { createInterface } from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import { eq } from "drizzle-orm";
import { db } from "../lib/db";
import { admins } from "../db/schema";
import { hashPassword } from "../lib/auth/password";

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
  const email = (await prompt("Admin email: ")).trim().toLowerCase();
  const name = (await prompt("Admin name: ")).trim();
  const password = await prompt("Password (min 12 chars): ", { hidden: true });

  if (!email || !name || !password) {
    console.error("✗ All fields required.");
    process.exit(1);
  }
  if (password.length < 12) {
    console.error("✗ Password must be at least 12 characters.");
    process.exit(1);
  }

  const existing = await db.query.admins.findFirst({ where: eq(admins.email, email) });
  if (existing) {
    console.error(`✗ Admin with email ${email} already exists.`);
    process.exit(1);
  }

  const passwordHash = await hashPassword(password);
  const [created] = await db
    .insert(admins)
    .values({ email, name, passwordHash })
    .returning({ id: admins.id, email: admins.email });

  console.log(`✓ Admin created: ${created?.email} (${created?.id})`);
  process.exit(0);
}

main().catch((err) => {
  console.error("✗ Failed:", err);
  process.exit(1);
});
