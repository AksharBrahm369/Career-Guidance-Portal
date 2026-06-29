import { evaluateEligibility } from "./eligibility";
import { marksAggregate, normalizeAptitude } from "./normalize";
import type {
  ClusterScore,
  CourseInput,
  CourseRecommendation,
  StudentProfile,
} from "./types";

const RIASEC_LABEL: Record<string, string> = {
  R: "Realistic",
  I: "Investigative",
  A: "Artistic",
  S: "Social",
  E: "Enterprising",
  C: "Conventional",
};

const FIT_CLUSTER_WEIGHT = 0.45;
const FIT_COURSE_WEIGHT = 0.55;
const COURSE_MARKS_WEIGHT = 0.34;
const COURSE_AFFINITY_WEIGHT = 0.32;
const COURSE_APTITUDE_WEIGHT = 0.2;
const COURSE_ELIGIBILITY_WEIGHT = 0.14;

type WeightedKey = { key: string; weight: number };

const SUBJECT_RULES: Array<{ subject: string; patterns: RegExp[] }> = [
  {
    subject: "Computer Science",
    patterns: [
      /\bcomputer science\b/i,
      /\bcomputer applications?\b/i,
      /\binformation technology\b/i,
      /\bit\s*&?\s*systems\b/i,
      /\bsoftware\b/i,
      /\bprogramming\b/i,
      /\bmobile applications?\b/i,
      /\bapp development\b/i,
      /\bweb development\b/i,
      /\bdata structures?\b/i,
      /\balgorithms?\b/i,
      /\bartificial intelligence\b/i,
      /\bdata science\b/i,
    ],
  },
  {
    subject: "Mathematics",
    patterns: [
      /\bmathematics\b/i,
      /\bmaths?\b/i,
      /\bquantitative\b/i,
      /\bnumerical\b/i,
      /\bengineering\b/i,
      /\bphysics\b/i,
      /\baccounting\b/i,
      /\bfinance\b/i,
      /\beconomics\b/i,
    ],
  },
  {
    subject: "Physics",
    patterns: [
      /\bphysics\b/i,
      /\bmechanical\b/i,
      /\bmarine\b/i,
      /\bnaval\b/i,
      /\bocean\b/i,
      /\bshipbuilding\b/i,
      /\belectronics\b/i,
      /\belectrical\b/i,
      /\bavionics\b/i,
      /\baerospace\b/i,
      /\baeronautical\b/i,
      /\baircraft\b/i,
    ],
  },
  {
    subject: "Chemistry",
    patterns: [
      /\bchemistry\b/i,
      /\bchemical\b/i,
      /\bbiotechnology\b/i,
      /\bpharmacy\b/i,
      /\bmedicine\b/i,
      /\bmaterials?\b/i,
    ],
  },
  {
    subject: "Biology",
    patterns: [
      /\bbiology\b/i,
      /\bmedical\b/i,
      /\bmedicine\b/i,
      /\bhealthcare\b/i,
      /\blife sciences?\b/i,
      /\bbiotechnology\b/i,
      /\bnursing\b/i,
      /\bpharmacy\b/i,
      /\bmbbs\b/i,
      /\bneet\b/i,
    ],
  },
  {
    subject: "English",
    patterns: [/\benglish\b/i, /\bliterature\b/i, /\bjournalism\b/i],
  },
  {
    subject: "Accountancy",
    patterns: [/\baccountancy\b/i, /\baccounting\b/i, /\bfinance\b/i, /\bb\.?\s*com\b/i],
  },
  {
    subject: "Business Studies",
    patterns: [
      /\bbusiness\b/i,
      /\bmanagement\b/i,
      /\badministration\b/i,
      /\bbba\b/i,
      /\bmarketing\b/i,
      /\bentrepreneurship\b/i,
      /\blogistics\b/i,
      /\bsupply chain\b/i,
      /\boperations\b/i,
    ],
  },
  {
    subject: "Economics",
    patterns: [/\beconomics\b/i, /\bcommerce\b/i, /\bfinance\b/i],
  },
];

const APTITUDE_RULES: Array<{ dimension: string; patterns: RegExp[] }> = [
  {
    dimension: "logical",
    patterns: [
      /\bcomputer\b/i,
      /\bsoftware\b/i,
      /\bprogramming\b/i,
      /\bdata structures?\b/i,
      /\balgorithms?\b/i,
      /\belectronics\b/i,
      /\bavionics\b/i,
      /\bartificial intelligence\b/i,
    ],
  },
  {
    dimension: "numerical",
    patterns: [
      /\bmathematics\b/i,
      /\bmaths?\b/i,
      /\bengineering\b/i,
      /\bfinance\b/i,
      /\baccounting\b/i,
      /\beconomics\b/i,
      /\bphysics\b/i,
    ],
  },
  {
    dimension: "spatial",
    patterns: [
      /\bmechanical\b/i,
      /\bshipbuilding\b/i,
      /\bmarine\b/i,
      /\bnaval\b/i,
      /\bocean\b/i,
      /\baerospace\b/i,
      /\baeronautical\b/i,
      /\baircraft\b/i,
      /\barchitecture\b/i,
      /\bdesign\b/i,
    ],
  },
  {
    dimension: "verbal",
    patterns: [
      /\benglish\b/i,
      /\bcommunication\b/i,
      /\blaw\b/i,
      /\bmanagement\b/i,
      /\bbusiness\b/i,
      /\badministration\b/i,
      /\bmarketing\b/i,
    ],
  },
];

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function addWeight(map: Map<string, number>, key: string, weight: number) {
  map.set(key, Math.max(map.get(key) ?? 0, weight));
}

function weightedKeys(map: Map<string, number>): WeightedKey[] {
  return Array.from(map, ([key, weight]) => ({ key, weight })).sort(
    (a, b) => b.weight - a.weight || a.key.localeCompare(b.key),
  );
}

function highSignalText(course: CourseInput): string {
  return [course.courseName, course.eligibilityCriteria, ...(course.entranceExams ?? [])]
    .filter(Boolean)
    .join(" ");
}

function lowSignalText(course: CourseInput): string {
  return [course.description, ...course.careerClusters].filter(Boolean).join(" ");
}

function addPcmSubjects(map: Map<string, number>, text: string, weight: number) {
  if (
    /\bpcm\b/i.test(text) ||
    /physics.{0,40}chemistry.{0,40}math(?:ematics|s)?/i.test(text)
  ) {
    addWeight(map, "Physics", weight);
    addWeight(map, "Chemistry", weight);
    addWeight(map, "Mathematics", weight);
  }
}

function addPcbSubjects(map: Map<string, number>, text: string, weight: number) {
  if (/\bpcb\b/i.test(text) || /physics.{0,40}chemistry.{0,40}biology/i.test(text)) {
    addWeight(map, "Physics", weight);
    addWeight(map, "Chemistry", weight);
    addWeight(map, "Biology", weight);
  }
}

function courseSubjectWeights(course: CourseInput): WeightedKey[] {
  const out = new Map<string, number>();

  for (const subject of course.requiredSubjects) addWeight(out, subject, 1);
  for (const subject of course.eligibility?.requiredStreamSubjects ?? []) {
    addWeight(out, subject, 1);
  }
  for (const subject of Object.keys(course.eligibility?.minBySubject ?? {})) {
    addWeight(out, subject, 1);
  }

  const highText = highSignalText(course);
  const lowText = lowSignalText(course);
  const titleText = course.courseName;
  addPcmSubjects(out, highText, 0.92);
  addPcbSubjects(out, highText, 0.92);
  addPcmSubjects(out, lowText, 0.62);
  addPcbSubjects(out, lowText, 0.62);

  for (const rule of SUBJECT_RULES) {
    if (rule.patterns.some((pattern) => pattern.test(titleText))) {
      addWeight(out, rule.subject, 1.05);
    } else if (rule.patterns.some((pattern) => pattern.test(highText))) {
      addWeight(out, rule.subject, 0.86);
    } else if (rule.patterns.some((pattern) => pattern.test(lowText))) {
      addWeight(out, rule.subject, 0.56);
    }
  }

  return weightedKeys(out);
}

function courseAptitudeWeights(course: CourseInput): WeightedKey[] {
  const out = new Map<string, number>();
  const highText = highSignalText(course);
  const lowText = lowSignalText(course);

  for (const rule of APTITUDE_RULES) {
    if (rule.patterns.some((pattern) => pattern.test(highText))) {
      addWeight(out, rule.dimension, 0.85);
    } else if (rule.patterns.some((pattern) => pattern.test(lowText))) {
      addWeight(out, rule.dimension, 0.55);
    }
  }

  return weightedKeys(out);
}

function meanSignal(map: Record<string, number>, scale: number): number {
  const values = Object.values(map);
  if (values.length === 0) return 0;
  return values.reduce((a, b) => a + b, 0) / values.length / scale;
}

function weightedSignal(map: Record<string, number>, keys: WeightedKey[], scale: number): number {
  const usable = keys.filter(({ key }) => map[key] != null);
  if (usable.length === 0) return meanSignal(map, scale);

  const totalWeight = usable.reduce((sum, item) => sum + item.weight, 0);
  if (totalWeight === 0) return 0;

  return (
    usable.reduce((sum, item) => sum + ((map[item.key] ?? 0) / scale) * item.weight, 0) /
    totalWeight
  );
}

function subjectMarksSignal(student: StudentProfile, subjectWeights: WeightedKey[]): number {
  return weightedSignal(student.marks?.subjects ?? {}, subjectWeights, 100);
}

function subjectAffinitySignal(student: StudentProfile, subjectWeights: WeightedKey[]): number {
  return weightedSignal(student.subjectAffinities ?? {}, subjectWeights, 1);
}

function aptitudeSignal(student: StudentProfile, aptitudeWeights: WeightedKey[]): number {
  return weightedSignal(normalizeAptitude(student.aptitude), aptitudeWeights, 1);
}

function inferredMinAggregate(course: CourseInput): number | null {
  if (course.eligibility?.minAggregate != null) return course.eligibility.minAggregate;

  const matches = [...(course.eligibilityCriteria ?? "").matchAll(/(\d{2,3})(?:\s*-\s*(\d{2,3}))?\s*%/g)];
  const values = matches
    .flatMap((match) => [match[1], match[2]])
    .map((value) => (value == null ? NaN : Number(value)))
    .filter((value) => Number.isFinite(value) && value >= 35 && value <= 100);

  return values.length > 0 ? Math.max(...values) : null;
}

function eligibilitySignal(student: StudentProfile, course: CourseInput): number {
  const aggregate = marksAggregate(student.marks);
  const minAggregate = inferredMinAggregate(course);
  if (minAggregate == null || aggregate === 0) return aggregate;

  const min01 = minAggregate / 100;
  if (aggregate < min01) return clamp01((aggregate / min01) * 0.7);
  return clamp01(0.65 + (aggregate - min01) * 0.8);
}

function courseSpecificSignal(student: StudentProfile, course: CourseInput): number {
  const subjectWeights = courseSubjectWeights(course);
  const aptitudeWeights = courseAptitudeWeights(course);

  return clamp01(
    COURSE_MARKS_WEIGHT * subjectMarksSignal(student, subjectWeights) +
      COURSE_AFFINITY_WEIGHT * subjectAffinitySignal(student, subjectWeights) +
      COURSE_APTITUDE_WEIGHT * aptitudeSignal(student, aptitudeWeights) +
      COURSE_ELIGIBILITY_WEIGHT * eligibilitySignal(student, course),
  );
}

function buildReasons(
  student: StudentProfile,
  course: CourseInput,
  cluster: ClusterScore,
  crossStream: boolean,
): string[] {
  const reasons: string[] = [];
  const subjectWeights = courseSubjectWeights(course);
  const topInterest = Object.entries(student.interests).sort(([, a], [, b]) => b - a)[0]?.[0];
  if (topInterest) reasons.push(`Matches your ${RIASEC_LABEL[topInterest] ?? topInterest} interest`);

  const strongApt = Object.entries(student.aptitude).find(([, v]) => v.band === "strong")?.[0];
  if (strongApt) reasons.push(`Backed by strong ${strongApt} aptitude`);

  const relSub = subjectWeights
    .filter(({ key }) => (student.marks?.subjects ?? {})[key] != null)
    .sort(
      (a, b) =>
        b.weight - a.weight ||
        (student.marks?.subjects[b.key] ?? 0) - (student.marks?.subjects[a.key] ?? 0),
    )[0]?.key;
  if (relSub) reasons.push(`Your ${relSub} marks (${student.marks!.subjects[relSub]}%) fit`);

  const likedSub = subjectWeights
    .filter(({ key }) => ((student.subjectAffinities ?? {})[key] ?? 0) >= 0.8)
    .sort(
      (a, b) =>
        ((student.subjectAffinities ?? {})[b.key] ?? 0) -
          ((student.subjectAffinities ?? {})[a.key] ?? 0) ||
        b.weight - a.weight,
    )[0]?.key;
  if (likedSub) reasons.push(`You enjoy ${likedSub}`);

  reasons.push(`Strong fit for the ${cluster.name} cluster`);
  if (crossStream) reasons.push(`Note: cross-stream from ${student.knownStream} - check the entrance route`);
  return reasons;
}

/**
 * Rank eligible courses. The fit score combines broad career-cluster fit with
 * course-specific evidence. For live fetched courses, the ranker uses the
 * course name, eligibility text, description, and entrance exams to infer
 * relevant subjects when structured `requiredSubjects` is empty.
 */
export function rankCourses(
  student: StudentProfile,
  clusterScores: ClusterScore[],
  courses: CourseInput[],
): CourseRecommendation[] {
  const scoreByKey = new Map(clusterScores.map((c) => [c.clusterKey, c]));
  const out: CourseRecommendation[] = [];

  for (const course of courses) {
    const elig = evaluateEligibility(student, course);
    if (!elig.eligible) continue;

    let best: ClusterScore | undefined;
    for (const key of course.careerClusters) {
      const cs = scoreByKey.get(key);
      if (cs && (!best || cs.score > best.score)) best = cs;
    }
    if (!best) continue;

    const courseSignal = courseSpecificSignal(student, course);
    let fit01 = FIT_CLUSTER_WEIGHT * best.score + FIT_COURSE_WEIGHT * courseSignal;
    if (elig.crossStream) fit01 *= 0.85;

    out.push({
      courseId: course.id,
      slug: course.slug,
      courseName: course.courseName,
      clusterKey: best.clusterKey,
      fitScore: Math.round(clamp01(fit01) * 1000) / 10,
      crossStream: elig.crossStream,
      reasons: buildReasons(student, course, best, elig.crossStream),
    });
  }

  return out.sort(
    (a, b) =>
      b.fitScore - a.fitScore ||
      Number(a.crossStream) - Number(b.crossStream) ||
      a.courseName.localeCompare(b.courseName),
  );
}
