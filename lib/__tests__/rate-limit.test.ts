import { beforeEach, describe, expect, it } from "vitest";
import { _resetForTest, consume } from "@/lib/rate-limit";

beforeEach(() => {
  _resetForTest();
});

describe("rate-limit (token bucket)", () => {
  it("allows up to capacity, then blocks", () => {
    const cfg = { capacity: 3, refillPerSecond: 0 };
    expect(consume("k", cfg).ok).toBe(true);
    expect(consume("k", cfg).ok).toBe(true);
    expect(consume("k", cfg).ok).toBe(true);
    expect(consume("k", cfg).ok).toBe(false);
  });

  it("isolates buckets by key", () => {
    const cfg = { capacity: 1, refillPerSecond: 0 };
    expect(consume("a", cfg).ok).toBe(true);
    expect(consume("a", cfg).ok).toBe(false);
    expect(consume("b", cfg).ok).toBe(true);
  });

  it("returns retryAfterSeconds when blocked", () => {
    const cfg = { capacity: 1, refillPerSecond: 0.5 };
    consume("k", cfg);
    const blocked = consume("k", cfg);
    expect(blocked.ok).toBe(false);
    expect(blocked.retryAfterSeconds).toBeGreaterThan(0);
  });
});
