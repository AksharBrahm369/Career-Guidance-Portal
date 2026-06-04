import { describe, expect, it } from "vitest";
import { scoreAptitude } from "@/lib/assessment/scoring/aptitude";

const items = [
  { id: "n1", dimension: "numerical", correctOptionId: "b" },
  { id: "n2", dimension: "numerical", correctOptionId: "a" },
  { id: "v1", dimension: "verbal", correctOptionId: "c" },
];

describe("scoreAptitude", () => {
  it("tallies correct answers per dimension and bands them", () => {
    const p = scoreAptitude({ n1: "b", n2: "a", v1: "x" }, items);
    expect(p.numerical).toEqual({ raw: 2, total: 2, band: "strong" });
    expect(p.verbal).toEqual({ raw: 0, total: 1, band: "developing" });
  });

  it("bands at the moderate threshold (>=0.4)", () => {
    const five = Array.from({ length: 5 }, (_, i) => ({
      id: `m${i}`,
      dimension: "logical",
      correctOptionId: "a",
    }));
    // 2 of 5 correct = 0.4 -> moderate
    const p = scoreAptitude({ m0: "a", m1: "a" }, five);
    expect(p.logical).toEqual({ raw: 2, total: 5, band: "moderate" });
  });
});
