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

  it("varies fit scores for live courses even when requiredSubjects is empty", () => {
    const liveStudent: StudentProfile = {
      ...student,
      aptitude: {
        logical: { raw: 2, total: 20, band: "developing" },
        numerical: { raw: 2, total: 21, band: "developing" },
        spatial: { raw: 6, total: 12, band: "moderate" },
      },
      marks: {
        board: "CBSE",
        stream: "science",
        subjects: { Biology: 99, English: 90, Physics: 70, Chemistry: 70, Mathematics: 60 },
        strengths: ["Biology", "English", "Physics", "Chemistry", "Mathematics"],
      },
      subjectAffinities: {
        Biology: 0.4,
        English: 1,
        Physics: 1,
        Chemistry: 0.8,
        Mathematics: 0.6,
        "Computer Science": 1,
      },
    };
    const liveCourses: CourseInput[] = [
      {
        id: "live-1",
        slug: "mobile-cse",
        courseName: "B.Tech in Computer Science and Engineering (Mobile Computing)",
        stream: "science",
        careerClusters: ["engineering-technology"],
        requiredSubjects: [],
        eligibilityCriteria: "10+2 with Physics, Chemistry, and Mathematics as compulsory subjects.",
        description: "Programming, data structures, algorithms, and mobile application development.",
        entranceExams: ["JEE Main"],
        eligibility: null,
      },
      {
        id: "live-2",
        slug: "shipbuilding",
        courseName: "B.Tech in Shipbuilding Technology",
        stream: "science",
        careerClusters: ["engineering-technology"],
        requiredSubjects: [],
        eligibilityCriteria: "Passed 10+2 with Physics, Chemistry, and Mathematics (PCM).",
        description: "Ship production methods, marine materials, fabrication, and repair.",
        entranceExams: ["IMU CET"],
        eligibility: null,
      },
      {
        id: "live-3",
        slug: "aviation-business",
        courseName: "BBA Aviation",
        stream: "science",
        careerClusters: ["commerce-management"],
        requiredSubjects: [],
        eligibilityCriteria: "10+2 in any stream with a minimum aggregate percentage.",
        description: "Airline management, airport operations, logistics, marketing, and finance.",
        entranceExams: ["CUET"],
        eligibility: null,
      },
    ];
    const liveClusters: ClusterScore[] = [
      ...clusterScores,
      {
        clusterKey: "commerce-management",
        name: "Commerce & Management",
        score: 0.65,
        breakdown: { interests: 0.2, aptitude: 0.1, workStyle: 0.2, marks: 0.15 },
      },
    ];

    const out = rankCourses(liveStudent, liveClusters, liveCourses);
    const scores = new Set(out.map((course) => course.fitScore));

    expect(out).toHaveLength(3);
    expect(scores.size).toBeGreaterThan(1);
    expect(out.find((course) => course.slug === "mobile-cse")?.reasons).toContain(
      "You enjoy Computer Science",
    );
  });
});
