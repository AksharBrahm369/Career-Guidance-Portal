import { describe, expect, it } from "vitest";
import { scoreSubjects } from "@/lib/assessment/scoring/subjects";

describe("scoreSubjects", () => {
  it("normalizes ratings within-student so the top-rated subject is 1", () => {
    const a = scoreSubjects({ Physics: 5, Mathematics: 4, History: 2 });
    expect(a.Physics).toBe(1);
    expect(a.Mathematics).toBeCloseTo(0.8);
    expect(a.History).toBeCloseTo(0.4);
  });

  it("drops zero/empty ratings and returns {} when there are none", () => {
    expect(scoreSubjects({})).toEqual({});
    expect(scoreSubjects({ Physics: 0 })).toEqual({});
  });
});
