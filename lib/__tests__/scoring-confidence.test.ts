import { describe, expect, it } from "vitest";
import { computeConfidence } from "@/lib/assessment/scoring/confidence";

describe("computeConfidence", () => {
  it("flags low when a self-report module is straight-lined", () => {
    const r = computeConfidence({ interests: { q1: "a", q2: "a", q3: "a", q4: "a" } });
    expect(r).toBe("low");
  });

  it("returns high for varied responses", () => {
    const r = computeConfidence({ interests: { q1: "a", q2: "b", q3: "c", q4: "a" } });
    expect(r).toBe("high");
  });

  it("does not flag fewer than 4 identical answers", () => {
    const r = computeConfidence({ interests: { q1: "a", q2: "a", q3: "a" } });
    expect(r).toBe("high");
  });
});
