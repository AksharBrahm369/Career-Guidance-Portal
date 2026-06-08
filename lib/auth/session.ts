import "server-only";
import { cache } from "react";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";

/**
 * Per-request memoized session lookup. `auth.api.getSession` is a non-fetch
 * async validation (a session-store hit) that React's automatic fetch
 * memoization does NOT cover, so within a single render the (admin) layout and
 * the route guards (requireAdmin/requireStudent) would otherwise each re-run it.
 * `React.cache` dedups them to a single call per request.
 *
 * Note: this reads `headers()` itself (rather than taking them as an argument)
 * so every caller produces the same cache key — `React.cache` keys on argument
 * identity (Object.is), and a fresh `headers()` object per call site would miss.
 */
export const getCachedSession = cache(async () => {
  return auth.api.getSession({ headers: await headers() });
});
