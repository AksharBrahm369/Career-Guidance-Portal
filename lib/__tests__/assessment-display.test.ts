import { describe, expect, it } from "vitest";
import { dimensionMaxScores } from "@/lib/assessment/display";

describe("dimensionMaxScores", () => {
  it("maps active item counts to 1-5 likert maxima per dimension", () => {
    expect(
      dimensionMaxScores([{ dimension: "A" }, { dimension: "A" }, { dimension: "C" }] as never),
    ).toEqual({ A: 10, C: 5 });
  });
});
