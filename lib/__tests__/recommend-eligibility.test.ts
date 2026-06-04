import { describe, expect, it } from "vitest";
import { evaluateEligibility } from "@/lib/recommendation/eligibility";
import type { CourseInput, StudentProfile } from "@/lib/recommendation/types";

const student: StudentProfile = {
  interests: {},
  workStyle: {},
  aptitude: {},
  marks: {
    board: "CBSE",
    stream: "science",
    subjects: { Physics: 80, Chemistry: 70, Mathematics: 90 },
    strengths: [],
  },
  knownStream: "science",
  confidence: "high",
};
const base: CourseInput = {
  id: "c1",
  slug: "btech",
  courseName: "B.Tech",
  stream: "science",
  careerClusters: ["engineering-technology"],
  requiredSubjects: ["Mathematics"],
  eligibility: null,
};

describe("evaluateEligibility", () => {
  it("passes an in-stream course with met constraints", () => {
    const r = evaluateEligibility(student, {
      ...base,
      eligibility: { minAggregate: 70, requiredStreamSubjects: ["Mathematics"] },
    });
    expect(r.eligible).toBe(true);
    expect(r.crossStream).toBe(false);
  });
  it("eliminates when a required stream subject is missing", () => {
    const r = evaluateEligibility(student, { ...base, eligibility: { requiredStreamSubjects: ["Biology"] } });
    expect(r.eligible).toBe(false);
  });
  it("eliminates when the aggregate is below the minimum", () => {
    const r = evaluateEligibility(student, { ...base, eligibility: { minAggregate: 95 } });
    expect(r.eligible).toBe(false);
  });
  it("eliminates when a per-subject minimum is not met", () => {
    const r = evaluateEligibility(student, { ...base, eligibility: { minBySubject: { Physics: 85 } } });
    expect(r.eligible).toBe(false);
  });
  it("flags cross-stream but stays eligible", () => {
    const r = evaluateEligibility({ ...student, knownStream: "commerce" }, base);
    expect(r.eligible).toBe(true);
    expect(r.crossStream).toBe(true);
  });
});
