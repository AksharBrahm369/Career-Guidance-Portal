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
  // Imported dynamically after dotenv has loaded. These modules validate env at
  // import time, so they must not be statically hoisted above the env load.
  const { auth } = await import("@/lib/auth");
  const { db } = await import("@/lib/db");
  const { user } = await import("@/db/schema");
  const { account } = await import("@/db/schema/auth");
  const { and, eq } = await import("drizzle-orm");
  const { adminUsernameToAuthEmail } = await import("@/lib/admin/admin-username");
  const { normalizePhone } = await import("@/lib/phone");
  const { hashPassword } = await import("better-auth/crypto");

  const envMode = Boolean(
    process.env.ADMIN_NAME ||
    process.env.ADMIN_USERNAME ||
    process.env.ADMIN_PASSWORD ||
    process.env.ADMIN_PHONE,
  );
  const name = (process.env.ADMIN_NAME ?? (await prompt("Admin name: "))).trim();
  const username = (
    process.env.ADMIN_USERNAME ?? (await prompt("Admin username (e.g. sevak@hp): "))
  ).trim();
  const phone = (
    process.env.ADMIN_PHONE ?? (envMode ? "" : await prompt("Admin phone (optional): "))
  ).trim();
  const password =
    process.env.ADMIN_PASSWORD ?? (await prompt("Password (min 12 chars): ", { hidden: true }));

  if (!name || !username || !password) {
    console.error("x Admin name, username, and password are required.");
    process.exit(1);
  }
  if (password.length < 12) {
    console.error("x Password must be at least 12 characters.");
    process.exit(1);
  }

  const normalizedPhone = phone ? normalizePhone(phone) : null;
  if (phone && !normalizedPhone) {
    console.error("x Phone normalizes to empty - enter a valid number.");
    process.exit(1);
  }

  const email = adminUsernameToAuthEmail(username);
  const existing = await db.query.user.findFirst({
    where: eq(user.email, email),
    columns: { id: true },
  });

  const userId =
    existing?.id ??
    (
      await auth.api.signUpEmail({
        body: { email, password, name },
      })
    ).user.id;

  if (existing) {
    const passwordHash = await hashPassword(password);
    const credentialAccount = await db.query.account.findFirst({
      where: and(eq(account.userId, userId), eq(account.providerId, "credential")),
      columns: { id: true },
    });

    if (credentialAccount) {
      await db
        .update(account)
        .set({ password: passwordHash, updatedAt: new Date() })
        .where(eq(account.id, credentialAccount.id));
    } else {
      await db.insert(account).values({
        accountId: userId,
        providerId: "credential",
        userId,
        password: passwordHash,
      });
    }
  }

  const userUpdate: Partial<typeof user.$inferInsert> = {
    name,
    phoneNumberVerified: false,
    role: "admin",
    banned: false,
  };
  if (normalizedPhone) userUpdate.phoneNumber = normalizedPhone;

  await db
    .update(user)
    // phoneNumberVerified stays false: v1 has no OTP, so we cannot prove
    // ownership of this number. See lib/auth.ts; do not trust this field.
    .set(userUpdate)
    .where(eq(user.id, userId));

  console.log(`Admin ready: ${username} (${userId})`);
  process.exit(0);
}

main().catch((err) => {
  console.error("x Failed:", err);
  process.exit(1);
});
