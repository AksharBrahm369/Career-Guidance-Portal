import { describe, expect, it } from "vitest";
import { scoreClusters } from "@/lib/recommendation/cluster-match";
import type { ClusterInput, StudentProfile } from "@/lib/recommendation/types";

const eng: ClusterInput = {
  key: "engineering-technology",
  name: "Engineering & Technology",
  targetProfile: { interests: { I: 1, R: 0.7 }, aptitude: { numerical: 1 }, workStyle: { Analytical: 1 } },
  lensWeights: { interests: 0.3, aptitude: 0.3, marks: 0.3, workStyle: 0.1 },
};
const arts: ClusterInput = {
  key: "arts-design",
  name: "Arts & Design",
  targetProfile: { interests: { A: 1 }, aptitude: { verbal: 1 }, workStyle: { Creative: 1 } },
  lensWeights: { interests: 0.4, aptitude: 0.2, marks: 0.25, workStyle: 0.15 },
};
const student: StudentProfile = {
  interests: { I: 10, R: 6 },
  workStyle: { Analytical: 5 },
  aptitude: { numerical: { raw: 4, total: 4, band: "strong" } },
  marks: { board: "CBSE", stream: "science", subjects: { Physics: 90 }, strengths: ["Physics"] },
  knownStream: "science",
  confidence: "high",
};

describe("scoreClusters", () => {
  it("ranks the aligned cluster above the misaligned one", () => {
    const ranked = scoreClusters(student, [eng, arts]);
    expect(ranked[0].clusterKey).toBe("engineering-technology");
    expect(ranked[0].score).toBeGreaterThan(ranked[1].score);
  });
  it("returns a per-lens breakdown and a 0..1 score", () => {
    const [top] = scoreClusters(student, [eng]);
    expect(top.score).toBeGreaterThan(0);
    expect(top.score).toBeLessThanOrEqual(1);
    expect(top.breakdown).toHaveProperty("interests");
    expect(top.breakdown).toHaveProperty("marks");
  });
});
