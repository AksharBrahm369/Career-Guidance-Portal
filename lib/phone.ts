/**
 * Canonical phone normalization — the SINGLE source of truth for turning a
 * raw, user-typed phone string into the identifier we store and authenticate
 * against. Used by:
 *   - the student signup route (stored `phoneNumber` + synth email)
 *   - the student auth form (before `signIn.phoneNumber`)
 *   - the admin login action (before `signInPhoneNumber`)
 *   - `pnpm create-admin`
 *
 * It MUST be deterministic and identical across every call site, otherwise the
 * same human phone can both collide on signup and fail to authenticate on login.
 *
 * No `server-only` here — the client auth form imports it too.
 *
 * v1 rules (India-focused, but pan-India-safe): strip everything that is not a
 * digit; drop a leading country-code "91" or "0" trunk prefix so that
 * "+91 98765 43210", "098765 43210" and "9876543210" all collapse to the same
 * 10-digit number. This is NOT full E.164 (no libphonenumber dependency), but
 * it is a stable canonical form shared by every path.
 */
export function normalizePhone(raw: string): string {
  let digits = raw.replace(/\D/g, "");
  // Strip an Indian country code or trunk-zero prefix when a 10-digit national
  // number is clearly present, so the same number in different formats matches.
  if (digits.length === 12 && digits.startsWith("91")) digits = digits.slice(2);
  else if (digits.length === 11 && digits.startsWith("0")) digits = digits.slice(1);
  return digits;
}

/** Synthetic email used to satisfy Better Auth core (phone is the real identifier). */
export function synthEmailFromPhone(raw: string): string {
  return `${normalizePhone(raw)}@phone.local`;
}
