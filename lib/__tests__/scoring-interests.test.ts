import { describe, expect, it } from "vitest";
import { scoreInterests, type ScoringItem } from "@/lib/assessment/scoring/interests";

const items: ScoringItem[] = [
  { id: "q1", dimension: "R", scoringMap: { a: { R: 1 }, b: { R: 5 } } },
  { id: "q2", dimension: "I", scoringMap: { a: { I: 1 }, b: { I: 5 } } },
];

describe("scoreInterests", () => {
  it("sums RIASEC contributions from chosen options", () => {
    const p = scoreInterests({ q1: "b", q2: "a" }, items);
    expect(p.R).toBe(5);
    expect(p.I).toBe(1);
    expect(p.A).toBe(0);
  });

  it("ignores responses with no matching item", () => {
    const p = scoreInterests({ qX: "b" }, items);
    expect(p.R).toBe(0);
  });

  it("ignores an option id absent from the scoring map", () => {
    const p = scoreInterests({ q1: "z" }, items);
    expect(p.R).toBe(0);
  });
});
