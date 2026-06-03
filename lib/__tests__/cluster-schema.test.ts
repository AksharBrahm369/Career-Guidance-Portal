import { describe, expect, it } from "vitest";
import { ClusterDefinition } from "@/lib/admin/clusters/cluster-schema";

const valid = {
  key: "engineering-technology",
  name: "Engineering & Technology",
  targetProfile: { interests: { I: 0.9, R: 0.7 }, aptitude: { numerical: 0.8, spatial: 0.7 }, workStyle: { Analytical: 0.8 } },
  lensWeights: { interests: 0.3, aptitude: 0.3, marks: 0.3, workStyle: 0.1 },
};

describe("ClusterDefinition", () => {
  it("accepts a valid cluster", () => {
    expect(ClusterDefinition.safeParse(valid).success).toBe(true);
  });

  it("rejects lens weights that do not sum to ~1", () => {
    const bad = { ...valid, lensWeights: { interests: 0.5, aptitude: 0.5, marks: 0.5, workStyle: 0.5 } };
    expect(ClusterDefinition.safeParse(bad).success).toBe(false);
  });

  it("rejects an empty key", () => {
    expect(ClusterDefinition.safeParse({ ...valid, key: "" }).success).toBe(false);
  });
});
