import "server-only";

export type UrlStatus = "ok" | "dead" | "unknown";

export interface UrlResult {
  url: string;
  status: UrlStatus;
  httpStatus?: number;
  error?: string;
}

export interface VerifyResult {
  ok: string[];
  dead: string[];
  unknown: string[];
  results: UrlResult[];
}

const DEFAULT_TIMEOUT_MS = 5000;
const USER_AGENT = "CareerBox-Source-Verifier/1.0 (+https://hp-career-box)";

const HEAD_FALLBACK_CODES = new Set([405, 501]);

export async function verifyUrls(
  urls: string[],
  opts: { timeoutMs?: number } = {},
): Promise<VerifyResult> {
  const timeoutMs = opts.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const seen = new Set<string>();
  const unique = urls.filter((u) => {
    const trimmed = u.trim();
    if (!trimmed || seen.has(trimmed)) return false;
    seen.add(trimmed);
    return true;
  });

  const results = await Promise.all(
    unique.map((url) => verifyOne(url, timeoutMs)),
  );

  return {
    ok: results.filter((r) => r.status === "ok").map((r) => r.url),
    dead: results.filter((r) => r.status === "dead").map((r) => r.url),
    unknown: results.filter((r) => r.status === "unknown").map((r) => r.url),
    results,
  };
}

async function verifyOne(url: string, timeoutMs: number): Promise<UrlResult> {
  // Validate the URL shape early — saves a network round-trip.
  try {
    new URL(url);
  } catch {
    return { url, status: "dead", error: "invalid_url" };
  }

  const headRes = await tryFetch(url, "HEAD", timeoutMs);
  if (headRes.kind === "ok") {
    if (headRes.status >= 200 && headRes.status < 400) {
      return { url, status: "ok", httpStatus: headRes.status };
    }
    if (HEAD_FALLBACK_CODES.has(headRes.status)) {
      return getFallback(url, timeoutMs);
    }
    return { url, status: "dead", httpStatus: headRes.status };
  }

  // Network failure on HEAD — retry once with GET (some hosts block HEAD silently).
  const getRes = await tryFetch(url, "GET", timeoutMs, true);
  if (getRes.kind === "ok") {
    if (getRes.status >= 200 && getRes.status < 400) {
      return { url, status: "ok", httpStatus: getRes.status };
    }
    return { url, status: "dead", httpStatus: getRes.status };
  }
  return { url, status: "unknown", error: getRes.error };
}

async function getFallback(url: string, timeoutMs: number): Promise<UrlResult> {
  const res = await tryFetch(url, "GET", timeoutMs, true);
  if (res.kind === "ok") {
    if (res.status >= 200 && res.status < 400) {
      return { url, status: "ok", httpStatus: res.status };
    }
    return { url, status: "dead", httpStatus: res.status };
  }
  return { url, status: "unknown", error: res.error };
}

type FetchAttempt =
  | { kind: "ok"; status: number }
  | { kind: "err"; error: string };

async function tryFetch(
  url: string,
  method: "HEAD" | "GET",
  timeoutMs: number,
  withRange = false,
): Promise<FetchAttempt> {
  const headers: Record<string, string> = {
    "User-Agent": USER_AGENT,
    Accept: "*/*",
  };
  if (withRange) headers.Range = "bytes=0-0";

  try {
    const res = await fetch(url, {
      method,
      headers,
      redirect: "follow",
      signal: AbortSignal.timeout(timeoutMs),
    });
    // Body may still be open; close it so the socket can return to the pool.
    if (res.body) {
      try {
        await res.body.cancel();
      } catch {
        /* ignore */
      }
    }
    return { kind: "ok", status: res.status };
  } catch (err) {
    const name = err instanceof Error ? err.name : "Error";
    const msg = err instanceof Error ? err.message : String(err);
    return { kind: "err", error: `${name}: ${msg}` };
  }
}
