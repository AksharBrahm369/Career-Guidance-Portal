/**
 * Dev/demo published catalogue so the recommendation result screen has content.
 * NOT authoritative data — production courses come through the admin
 * fetch → review → publish flow. Cluster keys match db/seed/clusters.ts.
 */

export type DemoInstitute = {
  slug: string;
  name: string;
  instituteType: "government" | "private" | "deemed" | "autonomous" | "international";
  rankingTag: "top_tier" | "good" | "average" | "unranked";
  city: string;
  state: string;
  websiteUrl?: string;
};

export type DemoCourse = {
  slug: string;
  courseName: string;
  stream: "science" | "commerce" | "arts" | "vocational";
  careerClusters: string[];
  aiSafetyTag: "ai_safe" | "ai_augmented" | "ai_risk";
  description: string;
  tenureYears: string; // numeric -> string per the Drizzle convention
  eligibilityCriteria: string; // free-text for display
  entranceExams: string[];
  requiredSubjects: string[];
  eligibility: {
    minAggregate?: number;
    minBySubject?: Record<string, number>;
    requiredStreamSubjects?: string[];
    entranceExams?: string[];
  };
  institutes: string[]; // institute slugs offering this course
};

export const DEMO_INSTITUTES: DemoInstitute[] = [
  { slug: "iit-delhi", name: "Indian Institute of Technology Delhi", instituteType: "government", rankingTag: "top_tier", city: "New Delhi", state: "Delhi", websiteUrl: "https://home.iitd.ac.in" },
  { slug: "aiims-delhi", name: "All India Institute of Medical Sciences, Delhi", instituteType: "government", rankingTag: "top_tier", city: "New Delhi", state: "Delhi", websiteUrl: "https://www.aiims.edu" },
  { slug: "srcc-delhi", name: "Shri Ram College of Commerce", instituteType: "autonomous", rankingTag: "top_tier", city: "New Delhi", state: "Delhi", websiteUrl: "https://www.srcc.edu" },
  { slug: "manipal-mit", name: "Manipal Institute of Technology", instituteType: "private", rankingTag: "good", city: "Manipal", state: "Karnataka", websiteUrl: "https://manipal.edu" },
];

export const DEMO_COURSES: DemoCourse[] = [
  {
    slug: "btech-computer-science",
    courseName: "B.Tech Computer Science & Engineering",
    stream: "science",
    careerClusters: ["engineering-technology"],
    aiSafetyTag: "ai_augmented",
    description: "Four-year undergraduate engineering degree in computing, algorithms, and software systems.",
    tenureYears: "4",
    eligibilityCriteria: "Class 12 with Physics, Chemistry, Mathematics; qualify JEE Main.",
    entranceExams: ["JEE Main"],
    requiredSubjects: ["Mathematics", "Physics"],
    eligibility: { requiredStreamSubjects: ["Mathematics"], minAggregate: 60, entranceExams: ["JEE Main"] },
    institutes: ["iit-delhi", "manipal-mit"],
  },
  {
    slug: "btech-mechanical",
    courseName: "B.Tech Mechanical Engineering",
    stream: "science",
    careerClusters: ["engineering-technology"],
    aiSafetyTag: "ai_augmented",
    description: "Four-year engineering degree in design, manufacturing, thermodynamics, and mechanics.",
    tenureYears: "4",
    eligibilityCriteria: "Class 12 with Physics, Chemistry, Mathematics; qualify JEE Main.",
    entranceExams: ["JEE Main"],
    requiredSubjects: ["Mathematics", "Physics"],
    eligibility: { requiredStreamSubjects: ["Mathematics", "Physics"], minAggregate: 55, entranceExams: ["JEE Main"] },
    institutes: ["iit-delhi", "manipal-mit"],
  },
  {
    slug: "mbbs",
    courseName: "MBBS (Bachelor of Medicine & Surgery)",
    stream: "science",
    careerClusters: ["healthcare-life-sciences"],
    aiSafetyTag: "ai_safe",
    description: "Five-and-a-half-year professional medical degree including internship.",
    tenureYears: "5.5",
    eligibilityCriteria: "Class 12 with Physics, Chemistry, Biology; qualify NEET.",
    entranceExams: ["NEET"],
    requiredSubjects: ["Biology", "Chemistry"],
    eligibility: { requiredStreamSubjects: ["Biology"], minAggregate: 70, entranceExams: ["NEET"] },
    institutes: ["aiims-delhi"],
  },
  {
    slug: "bsc-biotechnology",
    courseName: "B.Sc Biotechnology",
    stream: "science",
    careerClusters: ["healthcare-life-sciences"],
    aiSafetyTag: "ai_safe",
    description: "Three-year science degree spanning molecular biology, genetics, and bioprocess technology.",
    tenureYears: "3",
    eligibilityCriteria: "Class 12 with Biology and Chemistry.",
    entranceExams: ["CUET"],
    requiredSubjects: ["Biology", "Chemistry"],
    eligibility: { requiredStreamSubjects: ["Biology"], minAggregate: 55 },
    institutes: ["manipal-mit"],
  },
  {
    slug: "bcom-honours",
    courseName: "B.Com (Honours)",
    stream: "commerce",
    careerClusters: ["commerce-management"],
    aiSafetyTag: "ai_augmented",
    description: "Three-year commerce degree in accounting, finance, economics, and business law.",
    tenureYears: "3",
    eligibilityCriteria: "Class 12 (Commerce preferred); CUET for top colleges.",
    entranceExams: ["CUET"],
    requiredSubjects: ["Accountancy"],
    eligibility: { minAggregate: 50 },
    institutes: ["srcc-delhi"],
  },
  {
    slug: "bba",
    courseName: "BBA (Bachelor of Business Administration)",
    stream: "commerce",
    careerClusters: ["commerce-management"],
    aiSafetyTag: "ai_augmented",
    description: "Three-year management degree covering marketing, operations, HR, and entrepreneurship.",
    tenureYears: "3",
    eligibilityCriteria: "Class 12 in any stream.",
    entranceExams: ["CUET"],
    requiredSubjects: [],
    eligibility: { minAggregate: 50 },
    institutes: ["srcc-delhi", "manipal-mit"],
  },
];
