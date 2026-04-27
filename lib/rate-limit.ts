interface Bucket {
  tokens: number;
  updatedAt: number;
}

const buckets = new Map<string, Bucket>();

export interface RateLimitConfig {
  capacity: number;
  refillPerSecond: number;
}

export function consume(
  key: string,
  cfg: RateLimitConfig = { capacity: 10, refillPerSecond: 10 / 60 },
): { ok: boolean; remaining: number; retryAfterSeconds: number } {
  const now = Date.now();
  const existing = buckets.get(key);
  let tokens: number;
  if (existing) {
    const elapsedSec = (now - existing.updatedAt) / 1000;
    tokens = Math.min(cfg.capacity, existing.tokens + elapsedSec * cfg.refillPerSecond);
  } else {
    tokens = cfg.capacity;
  }

  if (tokens < 1) {
    buckets.set(key, { tokens, updatedAt: now });
    const retryAfter = Math.ceil((1 - tokens) / cfg.refillPerSecond);
    return { ok: false, remaining: 0, retryAfterSeconds: retryAfter };
  }

  tokens -= 1;
  buckets.set(key, { tokens, updatedAt: now });
  return { ok: true, remaining: Math.floor(tokens), retryAfterSeconds: 0 };
}

export function _resetForTest(): void {
  buckets.clear();
}
