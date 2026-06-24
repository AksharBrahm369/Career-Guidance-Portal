import type { PoolConfig } from "pg";

export function createPoolConfig(connectionString: string, max: number): PoolConfig {
  const config: PoolConfig = { connectionString, max };
  const url = safeUrl(connectionString);

  if (url && shouldUseRelaxedSsl(url)) {
    config.ssl = { rejectUnauthorized: false };
  }

  return config;
}

function safeUrl(value: string): URL | null {
  try {
    return new URL(value);
  } catch {
    return null;
  }
}

function shouldUseRelaxedSsl(url: URL): boolean {
  const host = url.hostname.toLowerCase();
  const sslMode = url.searchParams.get("sslmode")?.toLowerCase();

  return (
    host.includes("supabase.com") ||
    sslMode === "require" ||
    sslMode === "no-verify" ||
    sslMode === "disable-verify"
  );
}
