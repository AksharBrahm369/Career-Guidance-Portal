/* eslint-disable @typescript-eslint/no-explicit-any */
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { ImportItem } from "@/lib/admin/question-bank/item-schema";
import { STARTER_CLUSTERS } from "@/db/seed/clusters";
import { DEMO_COURSES, DEMO_INSTITUTES } from "@/db/seed/courses.demo";
import interestsStarter from "@/db/seed/items/onet-interests.starter.json";
import workStyleStarter from "@/db/seed/items/ipip-workstyle.starter.json";
import aptitudeTextStarter from "@/db/seed/items/aptitude-text.starter.json";
import authoredFigural from "@/db/seed/items/authored-figural.json";

export type LocalRow = Record<string, any>;

export type LocalTableKey =
  | "user"
  | "session"
  | "account"
  | "verification"
  | "rateLimit"
  | "courses"
  | "courseInstitutes"
  | "institutes"
  | "careerClusters"
  | "assessments"
  | "questionBank"
  | "auditLog";

export type LocalData = Record<LocalTableKey, LocalRow[]>;

const DATE_FIELDS = new Set([
  "createdAt",
  "updatedAt",
  "startedAt",
  "completedAt",
  "fetchedAt",
  "publishedAt",
  "expiresAt",
  "accessTokenExpiresAt",
  "refreshTokenExpiresAt",
  "banExpires",
  "lastAssessmentAt",
]);

const DEFAULT_STORE_PATH = path.join(process.cwd(), "data", "local-store.json");
const STORE_PATH = process.env.LOCAL_DATA_FILE
  ? path.resolve(process.env.LOCAL_DATA_FILE)
  : DEFAULT_STORE_PATH;

let cache: LocalData | null = null;
let lock: Promise<void> = Promise.resolve();

export function cloneLocalRow<T>(value: T): T {
  return structuredClone(value);
}

export async function readLocalData<T>(reader: (data: LocalData) => T | Promise<T>): Promise<T> {
  await lock;
  const data = await loadLocalData();
  return reader(data);
}

export async function mutateLocalData<T>(
  mutator: (data: LocalData) => T | Promise<T>,
): Promise<T> {
  let release: () => void = () => {};
  const current = lock;
  lock = new Promise<void>((resolve) => {
    release = resolve;
  });

  await current;
  const data = await loadLocalData();
  const before = cloneLocalRow(data);
  try {
    const result = await mutator(data);
    ensureUniqueConstraints(data);
    await saveLocalData(data);
    return result;
  } catch (err) {
    cache = before;
    throw err;
  } finally {
    release();
  }
}

export function localStorePath() {
  return STORE_PATH;
}

export function createEmptyLocalData(): LocalData {
  return {
    user: [],
    session: [],
    account: [],
    verification: [],
    rateLimit: [],
    courses: [],
    courseInstitutes: [],
    institutes: [],
    careerClusters: [],
    assessments: [],
    questionBank: [],
    auditLog: [],
  };
}

export function withTableDefaults(table: LocalTableKey, input: LocalRow): LocalRow {
  const now = new Date();
  const row = { ...input };
  if (!row.id) row.id = randomUUID();

  switch (table) {
    case "user":
      row.emailVerified ??= false;
      row.phoneNumberVerified ??= false;
      row.banned ??= false;
      row.cooldownOverride ??= false;
      row.createdAt ??= now;
      row.updatedAt ??= now;
      break;
    case "session":
      row.createdAt ??= now;
      row.updatedAt ??= now;
      break;
    case "account":
    case "verification":
      row.createdAt ??= now;
      row.updatedAt ??= now;
      break;
    case "rateLimit":
      row.count ??= 0;
      row.lastRequest ??= Date.now();
      break;
    case "courses":
      row.careerClusters ??= [];
      row.entranceExams ??= [];
      row.requiredSubjects ??= [];
      row.sourceUrls ??= [];
      row.status ??= "draft";
      row.createdAt ??= now;
      row.updatedAt ??= now;
      break;
    case "courseInstitutes":
      row.createdAt ??= now;
      break;
    case "institutes":
      row.rankingTag ??= "unranked";
      row.bestFitTags ??= [];
      row.status ??= "draft";
      row.createdAt ??= now;
      row.updatedAt ??= now;
      break;
    case "careerClusters":
      row.active ??= true;
      row.createdAt ??= now;
      row.updatedAt ??= now;
      break;
    case "assessments":
      row.status ??= "in_progress";
      row.careerClustersRanked ??= [];
      row.responses ??= {};
      row.startedAt ??= now;
      break;
    case "questionBank":
      row.source ??= "authored";
      row.version ??= 1;
      row.isActive ??= true;
      row.createdAt ??= now;
      break;
    case "auditLog":
      row.createdAt ??= now;
      break;
  }

  return row;
}

export function makeUniqueViolation(message: string) {
  const err = new Error(message) as Error & { code?: string };
  err.code = "23505";
  return err;
}

export function isDuplicateForTarget(
  data: LocalData,
  table: LocalTableKey,
  row: LocalRow,
  target?: string | string[],
): boolean {
  const rows = data[table];
  const targets = target ? (Array.isArray(target) ? target : [target]) : defaultConflictTarget(table);
  if (targets.length === 0) return false;

  return rows.some((existing) =>
    targets.every((field) => existing[field] != null && existing[field] === row[field]),
  );
}

function defaultConflictTarget(table: LocalTableKey): string[] {
  switch (table) {
    case "user":
      return ["email"];
    case "session":
      return ["token"];
    case "courses":
    case "institutes":
      return ["slug"];
    case "careerClusters":
      return ["key"];
    case "courseInstitutes":
      return ["courseId", "instituteId"];
    default:
      return [];
  }
}

async function loadLocalData(): Promise<LocalData> {
  if (cache) return cache;

  try {
    const raw = await readFile(STORE_PATH, "utf8");
    cache = reviveDates(JSON.parse(raw)) as LocalData;
    cache = normalizeLocalData(cache);
    return cache;
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code !== "ENOENT") throw err;
    cache = createInitialData();
    await saveLocalData(cache);
    return cache;
  }
}

async function saveLocalData(data: LocalData) {
  await mkdir(path.dirname(STORE_PATH), { recursive: true });
  await writeFile(STORE_PATH, `${JSON.stringify(data, null, 2)}\n`, "utf8");
}

function normalizeLocalData(value: Partial<LocalData>): LocalData {
  const base = createEmptyLocalData();
  for (const key of Object.keys(base) as LocalTableKey[]) {
    base[key] = Array.isArray(value[key]) ? value[key]! : [];
  }
  return base;
}

function reviveDates(value: unknown, key = ""): unknown {
  if (Array.isArray(value)) return value.map((item) => reviveDates(item));
  if (!value || typeof value !== "object") return value;
  const out: LocalRow = {};
  for (const [k, v] of Object.entries(value)) {
    if (typeof v === "string" && DATE_FIELDS.has(k)) out[k] = new Date(v);
    else out[k] = reviveDates(v, k);
  }
  if (typeof value === "string" && DATE_FIELDS.has(key)) return new Date(value);
  return out;
}

function createInitialData(): LocalData {
  const data = createEmptyLocalData();
  const now = new Date();

  for (const cluster of STARTER_CLUSTERS) {
    data.careerClusters.push(
      withTableDefaults("careerClusters", {
        id: randomUUID(),
        key: cluster.key,
        name: cluster.name,
        description: null,
        targetProfile: cluster.targetProfile,
        lensWeights: cluster.lensWeights,
        active: true,
        createdAt: now,
        updatedAt: now,
      }),
    );
  }

  const instituteIdsBySlug = new Map<string, string>();
  for (const institute of DEMO_INSTITUTES) {
    const id = randomUUID();
    instituteIdsBySlug.set(institute.slug, id);
    data.institutes.push(
      withTableDefaults("institutes", {
        id,
        slug: institute.slug,
        name: institute.name,
        instituteType: institute.instituteType,
        rankingTag: institute.rankingTag,
        city: institute.city,
        state: institute.state,
        region: null,
        annualFeesInr: null,
        websiteUrl: institute.websiteUrl ?? null,
        status: "published",
        bestFitTags: [],
        createdAt: now,
        updatedAt: now,
      }),
    );
  }

  for (const course of DEMO_COURSES) {
    const id = randomUUID();
    data.courses.push(
      withTableDefaults("courses", {
        id,
        slug: course.slug,
        courseName: course.courseName,
        courseCode: null,
        stream: course.stream,
        careerClusters: course.careerClusters,
        aiSafetyTag: course.aiSafetyTag,
        aiSafetyTagAi: null,
        aiSafetyReasoning: null,
        description: course.description,
        tenureYears: course.tenureYears,
        eligibilityCriteria: course.eligibilityCriteria,
        entranceExams: course.entranceExams,
        requiredSubjects: course.requiredSubjects,
        eligibility: course.eligibility,
        feesMinInr: null,
        feesMaxInr: null,
        sourceUrls: [],
        status: "published",
        source: "manual",
        createdByAdminId: null,
        reviewedByAdminId: null,
        lastEditedByAdminId: null,
        rejectionReason: null,
        fetchedAt: null,
        publishedAt: now,
        createdAt: now,
        updatedAt: now,
      }),
    );

    for (const slug of course.institutes) {
      const instituteId = instituteIdsBySlug.get(slug);
      if (!instituteId) continue;
      data.courseInstitutes.push(
        withTableDefaults("courseInstitutes", {
          id: randomUUID(),
          courseId: id,
          instituteId,
          createdAt: now,
        }),
      );
    }
  }

  for (const item of [
    ...toQuestionRows(interestsStarter),
    ...toQuestionRows(workStyleStarter),
    ...toQuestionRows(aptitudeTextStarter),
    ...toQuestionRows(authoredFigural),
  ]) {
    data.questionBank.push(withTableDefaults("questionBank", item));
  }

  return data;
}

function toQuestionRows(items: unknown[]): LocalRow[] {
  return items.map((raw, index) => {
    const parsed = ImportItem.safeParse(raw);
    if (!parsed.success) {
      throw new Error(`Seed item ${index} invalid: ${parsed.error.message}`);
    }
    const item = parsed.data;
    return {
      id: randomUUID(),
      module: item.module,
      dimension: item.dimension,
      questionText: item.questionText,
      options: item.options,
      correctOptionId: item.module === "aptitude" ? item.correctOptionId : null,
      scoringMap: item.module === "aptitude" ? null : item.scoringMap,
      source: item.source,
      license: item.license ?? null,
      version: item.version ?? 1,
      poolGroup: item.poolGroup ?? null,
      media: item.media ?? null,
      isActive: true,
      createdAt: new Date(),
    };
  });
}

function ensureUniqueConstraints(data: LocalData) {
  ensureUnique(data.user, "email", "user.email");
  ensureUnique(data.user, "phoneNumber", "user.phone_number", true);
  ensureUnique(data.session, "token", "session.token");
  ensureUnique(data.courses, "slug", "courses.slug");
  ensureUnique(data.institutes, "slug", "institutes.slug");
  ensureUnique(data.careerClusters, "key", "career_clusters.key");
  ensureCompositeUnique(
    data.courseInstitutes,
    ["courseId", "instituteId"],
    "course_institutes.course_id/institute_id",
  );
}

function ensureUnique(rows: LocalRow[], field: string, label: string, ignoreNull = false) {
  const seen = new Set<unknown>();
  for (const row of rows) {
    const value = row[field];
    if (ignoreNull && (value === null || value === undefined || value === "")) continue;
    if (seen.has(value)) throw makeUniqueViolation(`Unique constraint failed: ${label}`);
    seen.add(value);
  }
}

function ensureCompositeUnique(rows: LocalRow[], fields: string[], label: string) {
  const seen = new Set<string>();
  for (const row of rows) {
    const key = fields.map((field) => String(row[field] ?? "")).join("\u0000");
    if (seen.has(key)) throw makeUniqueViolation(`Unique constraint failed: ${label}`);
    seen.add(key);
  }
}
