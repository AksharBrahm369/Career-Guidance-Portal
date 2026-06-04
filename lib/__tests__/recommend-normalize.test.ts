import { describe, expect, it } from "vitest";
import {
  marksAggregate,
  normalizeAptitude,
  normalizeByMax,
  patternMatch,
} from "@/lib/recommendation/normalize";

describe("normalizeByMax", () => {
  it("scales the largest value to 1 and others proportionally", () => {
    expect(normalizeByMax({ R: 5, I: 10, A: 0 })).toEqual({ R: 0.5, I: 1, A: 0 });
  });
  it("returns zeros unchanged when all are zero", () => {
    expect(normalizeByMax({ R: 0, I: 0 })).toEqual({ R: 0, I: 0 });
  });
});

describe("normalizeAptitude", () => {
  it("converts raw/total into a 0..1 proportion per sub-ability", () => {
    const out = normalizeAptitude({
      numerical: { raw: 3, total: 4, band: "strong" },
      verbal: { raw: 0, total: 0, band: "developing" },
    });
    expect(out.numerical).toBeCloseTo(0.75);
    expect(out.verbal).toBe(0);
  });
});

describe("marksAggregate", () => {
  it("returns the mean percentage on a 0..1 scale", () => {
    expect(
      marksAggregate({
        board: "CBSE",
        stream: "science",
        subjects: { Physics: 80, Math: 100 },
        strengths: [],
      }),
    ).toBeCloseTo(0.9);
  });
  it("returns 0 for null/empty marks", () => {
    expect(marksAggregate(null)).toBe(0);
  });
});

describe("patternMatch", () => {
  it("is 1 for perfectly aligned vectors over the target's keys", () => {
    expect(patternMatch({ I: 1, R: 0.5, A: 0.2 }, { I: 1, R: 0.5 })).toBeCloseTo(1);
  });
  it("is 0 when the student has no signal on the target's keys", () => {
    expect(patternMatch({ A: 1 }, { I: 1, R: 0.5 })).toBe(0);
  });
});
