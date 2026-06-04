import { describe, expect, it } from "vitest";
import { recommend } from "@/lib/recommendation";
import type { ClusterInput, CourseInput, StudentProfile } from "@/lib/recommendation/types";

const clusters: ClusterInput[] = [
  {
    key: "engineering-technology",
    name: "Engineering & Technology",
    targetProfile: { interests: { I: 1 }, aptitude: { numerical: 1 }, workStyle: { Analytical: 1 } },
    lensWeights: { interests: 0.3, aptitude: 0.3, marks: 0.3, workStyle: 0.1 },
  },
];
const courses: CourseInput[] = [
  {
    id: "c1",
    slug: "btech",
    courseName: "B.Tech",
    stream: "science",
    careerClusters: ["engineering-technology"],
    requiredSubjects: ["Mathematics"],
    eligibility: null,
  },
];

describe("recommend", () => {
  it("returns ranked clusters + courses and a lowSignal flag", () => {
    const profile: StudentProfile = {
      interests: { I: 10, R: 2 },
      workStyle: { Analytical: 5 },
      aptitude: { numerical: { raw: 4, total: 4, band: "strong" } },
      marks: { board: "CBSE", stream: "science", subjects: { Mathematics: 90 }, strengths: ["Mathematics"] },
      knownStream: "science",
      confidence: "high",
    };
    const r = recommend(profile, clusters, courses);
    expect(r.clusterScores[0]!.clusterKey).toBe("engineering-technology");
    expect(r.recommendedCourses[0]!.slug).toBe("btech");
    expect(typeof r.lowSignal).toBe("boolean");
  });
  it("flags lowSignal when confidence is low", () => {
    const flat: StudentProfile = {
      interests: {},
      workStyle: {},
      aptitude: {},
      marks: null,
      knownStream: "science",
      confidence: "low",
    };
    const r = recommend(flat, clusters, courses);
    expect(r.lowSignal).toBe(true);
  });
});
