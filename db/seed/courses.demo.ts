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

export type DemoLearningResource = {
  courseSlug?: string;
  courseNameIncludes?: string[];
  title: string;
  url: string;
  platform: string;
  resourceType: "YouTube Video" | "Website" | "Free Course" | "Tutorial";
  description: string;
  thumbnailUrl?: string;
  language: "English" | "Hindi" | "Mixed";
  difficulty: "Beginner" | "Intermediate";
  isFree: boolean;
};

export const DEMO_INSTITUTES: DemoInstitute[] = [
  {
    slug: "iit-delhi",
    name: "Indian Institute of Technology Delhi",
    instituteType: "government",
    rankingTag: "top_tier",
    city: "New Delhi",
    state: "Delhi",
    websiteUrl: "https://home.iitd.ac.in",
  },
  {
    slug: "aiims-delhi",
    name: "All India Institute of Medical Sciences, Delhi",
    instituteType: "government",
    rankingTag: "top_tier",
    city: "New Delhi",
    state: "Delhi",
    websiteUrl: "https://www.aiims.edu",
  },
  {
    slug: "srcc-delhi",
    name: "Shri Ram College of Commerce",
    instituteType: "autonomous",
    rankingTag: "top_tier",
    city: "New Delhi",
    state: "Delhi",
    websiteUrl: "https://www.srcc.edu",
  },
  {
    slug: "manipal-mit",
    name: "Manipal Institute of Technology",
    instituteType: "private",
    rankingTag: "good",
    city: "Manipal",
    state: "Karnataka",
    websiteUrl: "https://manipal.edu",
  },
];

export const DEMO_COURSES: DemoCourse[] = [
  {
    slug: "btech-computer-science",
    courseName: "B.Tech Computer Science & Engineering",
    stream: "science",
    careerClusters: ["engineering-technology"],
    aiSafetyTag: "ai_augmented",
    description:
      "Four-year undergraduate engineering degree in computing, algorithms, and software systems.",
    tenureYears: "4",
    eligibilityCriteria: "Class 12 with Physics, Chemistry, Mathematics; qualify JEE Main.",
    entranceExams: ["JEE Main"],
    requiredSubjects: ["Mathematics", "Physics"],
    eligibility: {
      requiredStreamSubjects: ["Mathematics"],
      minAggregate: 60,
      entranceExams: ["JEE Main"],
    },
    institutes: ["iit-delhi", "manipal-mit"],
  },
  {
    slug: "btech-mechanical",
    courseName: "B.Tech Mechanical Engineering",
    stream: "science",
    careerClusters: ["engineering-technology"],
    aiSafetyTag: "ai_augmented",
    description:
      "Four-year engineering degree in design, manufacturing, thermodynamics, and mechanics.",
    tenureYears: "4",
    eligibilityCriteria: "Class 12 with Physics, Chemistry, Mathematics; qualify JEE Main.",
    entranceExams: ["JEE Main"],
    requiredSubjects: ["Mathematics", "Physics"],
    eligibility: {
      requiredStreamSubjects: ["Mathematics", "Physics"],
      minAggregate: 55,
      entranceExams: ["JEE Main"],
    },
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
    description:
      "Three-year science degree spanning molecular biology, genetics, and bioprocess technology.",
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
    description:
      "Three-year management degree covering marketing, operations, HR, and entrepreneurship.",
    tenureYears: "3",
    eligibilityCriteria: "Class 12 in any stream.",
    entranceExams: ["CUET"],
    requiredSubjects: [],
    eligibility: { minAggregate: 50 },
    institutes: ["srcc-delhi", "manipal-mit"],
  },
];

export const DEMO_LEARNING_RESOURCES: DemoLearningResource[] = [
  {
    courseSlug: "btech-computer-science",
    title: "Computer Science beginner learning path",
    url: "https://www.freecodecamp.org/news/search/?query=computer%20science%20beginner",
    platform: "freeCodeCamp",
    resourceType: "Tutorial",
    description:
      "Searches freeCodeCamp for beginner-friendly computing articles and hands-on programming explanations.",
    language: "English",
    difficulty: "Beginner",
    isFree: true,
  },
  {
    courseSlug: "btech-computer-science",
    title: "Programming basics and data structures videos",
    url: "https://www.youtube.com/results?search_query=computer%20science%20data%20structures%20beginner%20playlist",
    platform: "YouTube",
    resourceType: "YouTube Video",
    description:
      "A safe YouTube search for introductory playlists on programming and data structures.",
    language: "English",
    difficulty: "Beginner",
    isFree: true,
  },
  {
    courseSlug: "btech-computer-science",
    title: "MDN web development basics",
    url: "https://developer.mozilla.org/en-US/docs/Learn",
    platform: "MDN Web Docs",
    resourceType: "Website",
    description:
      "Official beginner documentation for web fundamentals, useful for CSE students starting practical projects.",
    language: "English",
    difficulty: "Beginner",
    isFree: true,
  },
  {
    courseSlug: "btech-mechanical",
    title: "Mechanical engineering basics on NPTEL",
    url: "https://nptel.ac.in/courses?search=mechanical%20engineering%20basics",
    platform: "NPTEL",
    resourceType: "Free Course",
    description:
      "Searches NPTEL for free Indian engineering lectures on core mechanical engineering subjects.",
    language: "English",
    difficulty: "Beginner",
    isFree: true,
  },
  {
    courseSlug: "btech-mechanical",
    title: "Thermodynamics beginner videos",
    url: "https://www.youtube.com/results?search_query=thermodynamics%20mechanical%20engineering%20beginner%20playlist",
    platform: "YouTube",
    resourceType: "YouTube Video",
    description: "A beginner search for one of the core first-year mechanical engineering topics.",
    language: "English",
    difficulty: "Beginner",
    isFree: true,
  },
  {
    courseSlug: "btech-mechanical",
    title: "Physics foundations for mechanics",
    url: "https://www.khanacademy.org/science/physics",
    platform: "Khan Academy",
    resourceType: "Website",
    description:
      "Free physics foundations that help students prepare for mechanics, motion, energy, and forces.",
    language: "English",
    difficulty: "Beginner",
    isFree: true,
  },
  {
    courseSlug: "mbbs",
    title: "Health and medicine foundations",
    url: "https://www.khanacademy.org/science/health-and-medicine",
    platform: "Khan Academy",
    resourceType: "Website",
    description: "Beginner-friendly lessons on human body systems and medical science foundations.",
    language: "English",
    difficulty: "Beginner",
    isFree: true,
  },
  {
    courseSlug: "mbbs",
    title: "NEET biology basics videos",
    url: "https://www.youtube.com/results?search_query=NEET%20biology%20basics%20Hindi%20beginner",
    platform: "YouTube",
    resourceType: "YouTube Video",
    description:
      "A Hindi-friendly search for biology basics that supports MBBS entrance preparation.",
    language: "Hindi",
    difficulty: "Beginner",
    isFree: true,
  },
  {
    courseSlug: "mbbs",
    title: "SWAYAM health science courses",
    url: "https://swayam.gov.in/explorer?searchText=health%20science%20biology",
    platform: "SWAYAM",
    resourceType: "Free Course",
    description:
      "Searches SWAYAM for free Indian online courses related to health science and biology.",
    language: "English",
    difficulty: "Beginner",
    isFree: true,
  },
  {
    courseSlug: "bsc-biotechnology",
    title: "Biology foundations",
    url: "https://www.khanacademy.org/science/biology",
    platform: "Khan Academy",
    resourceType: "Website",
    description:
      "Free lessons covering biology foundations needed before genetics, cells, and biotechnology topics.",
    language: "English",
    difficulty: "Beginner",
    isFree: true,
  },
  {
    courseSlug: "bsc-biotechnology",
    title: "Biotechnology courses on NPTEL",
    url: "https://nptel.ac.in/courses?search=biotechnology",
    platform: "NPTEL",
    resourceType: "Free Course",
    description: "Searches NPTEL for biotechnology lectures from Indian faculty and institutes.",
    language: "English",
    difficulty: "Intermediate",
    isFree: true,
  },
  {
    courseSlug: "bsc-biotechnology",
    title: "Biotechnology beginner videos",
    url: "https://www.youtube.com/results?search_query=biotechnology%20beginner%20playlist",
    platform: "YouTube",
    resourceType: "YouTube Video",
    description:
      "A beginner YouTube search for biotechnology concepts, vocabulary, and career orientation.",
    language: "English",
    difficulty: "Beginner",
    isFree: true,
  },
  {
    courseSlug: "bcom-honours",
    title: "Finance and accounting basics",
    url: "https://www.khanacademy.org/economics-finance-domain/core-finance",
    platform: "Khan Academy",
    resourceType: "Website",
    description:
      "Free finance foundations that support accounting, business finance, and commerce coursework.",
    language: "English",
    difficulty: "Beginner",
    isFree: true,
  },
  {
    courseSlug: "bcom-honours",
    title: "Accountancy basics in Hindi",
    url: "https://www.youtube.com/results?search_query=class%2011%2012%20accountancy%20basics%20Hindi",
    platform: "YouTube",
    resourceType: "YouTube Video",
    description:
      "A Hindi search for accountancy basics, useful for students entering B.Com without strong foundations.",
    language: "Hindi",
    difficulty: "Beginner",
    isFree: true,
  },
  {
    courseSlug: "bcom-honours",
    title: "Commerce courses on SWAYAM",
    url: "https://swayam.gov.in/explorer?searchText=commerce%20accounting%20finance",
    platform: "SWAYAM",
    resourceType: "Free Course",
    description:
      "Searches SWAYAM for free Indian commerce, accounting, and finance learning material.",
    language: "English",
    difficulty: "Beginner",
    isFree: true,
  },
  {
    courseSlug: "bba",
    title: "Business management basics",
    url: "https://www.youtube.com/results?search_query=business%20management%20basics%20beginner%20playlist",
    platform: "YouTube",
    resourceType: "YouTube Video",
    description:
      "A beginner search for management concepts, business functions, and BBA orientation videos.",
    language: "English",
    difficulty: "Beginner",
    isFree: true,
  },
  {
    courseSlug: "bba",
    title: "Management courses on SWAYAM",
    url: "https://swayam.gov.in/explorer?searchText=business%20management",
    platform: "SWAYAM",
    resourceType: "Free Course",
    description: "Searches SWAYAM for free management and business administration courses.",
    language: "English",
    difficulty: "Beginner",
    isFree: true,
  },
  {
    courseSlug: "bba",
    title: "Business administration courses",
    url: "https://www.coursera.org/search?query=business%20administration",
    platform: "Coursera",
    resourceType: "Free Course",
    description:
      "A course search where students can look for free-to-audit business administration material.",
    language: "English",
    difficulty: "Beginner",
    isFree: true,
  },
  {
    courseNameIncludes: ["data science"],
    title: "Data science with Python beginner videos",
    url: "https://www.youtube.com/results?search_query=data%20science%20python%20beginner%20playlist",
    platform: "YouTube",
    resourceType: "YouTube Video",
    description:
      "A beginner YouTube search for Python, data handling, and applied data science foundations.",
    language: "English",
    difficulty: "Beginner",
    isFree: true,
  },
  {
    courseNameIncludes: ["artificial intelligence", "ai"],
    title: "Artificial intelligence beginner course search",
    url: "https://www.freecodecamp.org/news/search/?query=artificial%20intelligence%20beginner",
    platform: "freeCodeCamp",
    resourceType: "Tutorial",
    description:
      "Searches freeCodeCamp for accessible AI explainers, machine learning basics, and beginner projects.",
    language: "English",
    difficulty: "Beginner",
    isFree: true,
  },
  {
    courseNameIncludes: ["computer applications", "bca"],
    title: "Computer applications practice tutorials",
    url: "https://www.geeksforgeeks.org/?s=computer%20applications%20beginner",
    platform: "GeeksforGeeks",
    resourceType: "Tutorial",
    description:
      "Searches practical programming and computer applications tutorials for new learners.",
    language: "English",
    difficulty: "Beginner",
    isFree: true,
  },
  {
    courseNameIncludes: ["digital literacy"],
    title: "Digital literacy basics videos",
    url: "https://www.youtube.com/results?search_query=digital%20literacy%20basics%20Hindi%20English",
    platform: "YouTube",
    resourceType: "YouTube Video",
    description: "A mixed-language search for basic computer, internet, and online safety skills.",
    language: "Mixed",
    difficulty: "Beginner",
    isFree: true,
  },
  {
    courseNameIncludes: ["career readiness"],
    title: "Career readiness and interview skills",
    url: "https://www.youtube.com/results?search_query=career%20readiness%20interview%20skills%20India%20beginner",
    platform: "YouTube",
    resourceType: "YouTube Video",
    description:
      "A beginner search for employability, interview preparation, and workplace readiness videos.",
    language: "Mixed",
    difficulty: "Beginner",
    isFree: true,
  },
];
