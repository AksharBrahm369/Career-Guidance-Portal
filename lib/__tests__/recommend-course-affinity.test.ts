import { describe, expect, it } from "vitest";
import { rankCourses } from "@/lib/recommendation/course-rank";
import type { ClusterScore, CourseInput, StudentProfile } from "@/lib/recommendation/types";

const clusterScores: ClusterScore[] = [
  {
    clusterKey: "engineering-technology",
    name: "Engineering & Technology",
    score: 0.8,
    breakdown: { interests: 0.3, aptitude: 0.3, workStyle: 0.1, marks: 0.1 },
  },
];
const courses: CourseInput[] = [
  {
    id: "c1",
    slug: "btech-cse",
    courseName: "B.Tech CSE",
    stream: "science",
    careerClusters: ["engineering-technology"],
    requiredSubjects: ["Mathematics"],
    eligibility: null,
  },
];
const base: StudentProfile = {
  interests: { I: 10 },
  workStyle: { Analytical: 5 },
  aptitude: { numerical: { raw: 4, total: 4, band: "strong" } },
  marks: { board: "CBSE", stream: "science", subjects: { Mathematics: 90 }, strengths: ["Mathematics"] },
  knownStream: "science",
  confidence: "high",
};

describe("rankCourses subject affinity", () => {
  it("raises fit and adds an 'enjoy' reason when the student likes the required subject", () => {
    const without = rankCourses(base, clusterScores, courses)[0]!;
    const withLike = rankCourses({ ...base, subjectAffinities: { Mathematics: 1 } }, clusterScores, courses)[0]!;

    expect(withLike.fitScore).toBeGreaterThan(without.fitScore);
    expect(withLike.reasons.some((r) => r.includes("enjoy Mathematics"))).toBe(true);
    expect(without.reasons.some((r) => r.includes("enjoy"))).toBe(false);
  });
});
