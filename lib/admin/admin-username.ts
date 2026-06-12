/**
 * Admins sign in with a short username, but Better Auth's password provider
 * authenticates by email. Keep the public username stable and map it to an
 * internal email address that satisfies the auth adapter.
 */
export function adminUsernameToAuthEmail(username: string): string {
  const trimmed = username.trim().toLowerCase();
  const [local, domain, ...rest] = trimmed.split("@");

  if (!local || !domain || rest.length > 0) return trimmed;
  if (domain.includes(".")) return trimmed;

  return `${local}@${domain}.admin.local`;
}
