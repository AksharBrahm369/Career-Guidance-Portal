import { describe, expect, it } from "vitest";
import { rankCourses } from "@/lib/recommendation/course-rank";
import type { ClusterScore, CourseInput, StudentProfile } from "@/lib/recommendation/types";

const student: StudentProfile = {
  interests: { I: 10 },
  workStyle: { Analytical: 5 },
  aptitude: { numerical: { raw: 4, total: 4, band: "strong" } },
  marks: {
    board: "CBSE",
    stream: "science",
    subjects: { Mathematics: 90, Physics: 80 },
    strengths: ["Mathematics", "Physics"],
  },
  knownStream: "science",
  confidence: "high",
};
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
    eligibility: { requiredStreamSubjects: ["Mathematics"] },
  },
  {
    id: "c2",
    slug: "ba-eng",
    courseName: "BA English",
    stream: "arts",
    careerClusters: ["arts-design"],
    requiredSubjects: [],
    eligibility: null,
  },
];

describe("rankCourses", () => {
  it("ranks an eligible in-cluster course above one with no matching cluster", () => {
    const out = rankCourses(student, clusterScores, courses);
    expect(out[0]!.slug).toBe("btech-cse");
    expect(out[0]!.fitScore).toBeGreaterThan(0);
    expect(out[0]!.reasons.length).toBeGreaterThan(0);
  });
  it("excludes courses eliminated by the eligibility gate", () => {
    const blocked: CourseInput = {
      id: "c3",
      slug: "mbbs",
      courseName: "MBBS",
      stream: "science",
      careerClusters: ["engineering-technology"],
      requiredSubjects: [],
      eligibility: { requiredStreamSubjects: ["Biology"] },
    };
    const out = rankCourses(student, clusterScores, [blocked]);
    expect(out.find((r) => r.slug === "mbbs")).toBeUndefined();
  });
});
