import "server-only";
import { generateText, Output } from "ai";
import { z } from "zod";
import { getModel } from "./client";
import { verifyUrls } from "@/lib/url-verify";
import type { LearningResourceInput } from "@/lib/admin/learning-resources";

type CourseContext = {
  courseName: string;
  stream: string;
  careerClusters: string[];
  description: string;
};

const SearchPlatform = z.enum([
  "YouTube",
  "SWAYAM",
  "NPTEL",
  "freeCodeCamp",
  "GeeksforGeeks",
  "Khan Academy",
  "MDN",
  "Coursera",
]);

const SearchPlanItem = z.object({
  query: z.string().min(3).max(140),
  platform: SearchPlatform,
  resourceType: z.enum(["YouTube Video", "Website", "Free Course", "Tutorial"]),
  language: z.enum(["English", "Hindi", "Mixed"]),
  difficulty: z.enum(["Beginner", "Intermediate"]),
  description: z.string().min(20).max(240),
});

const SearchPlanOutput = z.object({
  resources: z.array(SearchPlanItem).min(3).max(5),
});

type SearchPlanItem = z.infer<typeof SearchPlanItem>;

const TRUSTED_PLATFORM_LABELS: Record<z.infer<typeof SearchPlatform>, string> = {
  YouTube: "YouTube",
  SWAYAM: "SWAYAM",
  NPTEL: "NPTEL",
  freeCodeCamp: "freeCodeCamp",
  GeeksforGeeks: "GeeksforGeeks",
  "Khan Academy": "Khan Academy",
  MDN: "MDN Web Docs",
  Coursera: "Coursera",
};

export async function fetchLearningResourceDrafts(course: CourseContext): Promise<{
  resources: LearningResourceInput[];
  warnings: string[];
  provider: string;
}> {
  const warnings: string[] = [];
  const { plan, provider } = await buildSearchPlan(course, warnings);
  const candidates: LearningResourceInput[] = [];

  for (const item of plan) {
    if (item.platform === "YouTube") {
      const video = await fetchYouTubeVideo(item, warnings);
      candidates.push(video ?? youtubeSearchResource(item));
      continue;
    }
    candidates.push(platformSearchResource(item));
  }

  const deduped = dedupeByUrl(candidates).slice(0, 5);
  const verification = await verifyUrls(
    deduped.map((resource) => resource.url),
    { timeoutMs: 6000 },
  );
  const verified = deduped.filter((resource) => !verification.dead.includes(resource.url));

  for (const dead of verification.dead) {
    warnings.push(`Dropped resource URL that returned 4xx/5xx: ${dead}`);
  }
  for (const unknown of verification.unknown) {
    warnings.push(`Could not fully verify this URL, saved for admin review: ${unknown}`);
  }

  return { resources: verified, warnings, provider };
}

export function buildFallbackLearningResourcePlan(course: CourseContext): SearchPlanItem[] {
  const courseName = course.courseName.trim();
  const technical = isTechnicalCourse(course);
  const medical = hasAny(course, ["medical", "biology", "biotechnology", "health"]);
  const commerce = hasAny(course, ["commerce", "business", "finance", "accounting", "management"]);

  const freeCoursePlatform = technical ? "freeCodeCamp" : commerce || medical ? "SWAYAM" : "NPTEL";
  const tutorialPlatform = technical ? "GeeksforGeeks" : medical ? "Khan Academy" : "NPTEL";

  return [
    {
      query: `${courseName} beginner playlist`,
      platform: "YouTube",
      resourceType: "YouTube Video",
      language: "English",
      difficulty: "Beginner",
      description: `A beginner video or playlist can help students see the main ideas in ${courseName} before choosing deeper study material.`,
    },
    {
      query: `${courseName} Hindi beginner tutorial`,
      platform: "YouTube",
      resourceType: "YouTube Video",
      language: "Hindi",
      difficulty: "Beginner",
      description: `A Hindi explainer search is useful for first-generation learners who are more comfortable starting in Hindi.`,
    },
    {
      query: `${courseName} free course beginner`,
      platform: freeCoursePlatform,
      resourceType: "Free Course",
      language: "English",
      difficulty: "Beginner",
      description: `This points students toward free structured material they can review before committing to paid classes.`,
    },
    {
      query: `${courseName} basics tutorial`,
      platform: tutorialPlatform,
      resourceType: "Tutorial",
      language: "English",
      difficulty: "Beginner",
      description: `A tutorial search helps students practice the foundations and understand the vocabulary used in this course.`,
    },
    {
      query: `${courseName} career roadmap India`,
      platform: "YouTube",
      resourceType: "YouTube Video",
      language: "Mixed",
      difficulty: "Beginner",
      description: `A roadmap resource connects learning topics with Indian education and career pathways.`,
    },
  ];
}

async function buildSearchPlan(
  course: CourseContext,
  warnings: string[],
): Promise<{ plan: SearchPlanItem[]; provider: string }> {
  try {
    const { model, providerLabel } = getModel("fetch");
    const { experimental_output } = await generateText({
      model,
      system:
        "You create search plans for an Indian career guidance portal. Return search keywords only, never URLs. Prefer free, beginner-friendly, trusted resources. Avoid adult, political, clickbait, or unrelated topics.",
      prompt: `Create 3 to 5 learning resource searches for this course.

Course: ${course.courseName}
Stream: ${course.stream}
Career clusters: ${course.careerClusters.join(", ") || "Not specified"}
Description: ${course.description}

Rules:
- Return search queries, not links.
- Include at least one YouTube search and one free learning platform search.
- Consider underprivileged Indian students and first-time learners.
- Keep resources beginner or intermediate only.`,
      experimental_output: Output.object({ schema: SearchPlanOutput }),
      temperature: 0.3,
      maxRetries: 1,
    });

    const plan = experimental_output?.resources;
    if (plan?.length) return { plan, provider: providerLabel };
    warnings.push("AI returned no search plan, so deterministic fallback queries were used.");
  } catch (err) {
    warnings.push(
      `AI search plan unavailable; fallback queries were used. ${
        err instanceof Error ? err.message : String(err)
      }`,
    );
  }

  return {
    plan: buildFallbackLearningResourcePlan(course),
    provider: "fallback search plan",
  };
}

async function fetchYouTubeVideo(
  item: SearchPlanItem,
  warnings: string[],
): Promise<LearningResourceInput | null> {
  const key = process.env.YOUTUBE_API_KEY?.trim();
  if (!key) return null;

  const url = new URL("https://www.googleapis.com/youtube/v3/search");
  url.searchParams.set("part", "snippet");
  url.searchParams.set("type", "video");
  url.searchParams.set("maxResults", "1");
  url.searchParams.set("safeSearch", "strict");
  url.searchParams.set("videoEmbeddable", "true");
  url.searchParams.set("q", item.query);
  url.searchParams.set("key", key);
  if (item.language === "Hindi") url.searchParams.set("relevanceLanguage", "hi");
  if (item.language === "English") url.searchParams.set("relevanceLanguage", "en");

  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) {
      warnings.push(`YouTube API returned HTTP ${res.status}; saved YouTube search URL instead.`);
      return null;
    }
    const data = (await res.json()) as YouTubeSearchResponse;
    const first = data.items?.find((video) => video.id.videoId);
    const videoId = first?.id.videoId;
    if (!first || !videoId) return null;

    return {
      title: first.snippet.title,
      url: `https://www.youtube.com/watch?v=${videoId}`,
      platform: "YouTube",
      resourceType: "YouTube Video",
      description: item.description,
      thumbnailUrl:
        first.snippet.thumbnails.medium?.url ?? first.snippet.thumbnails.default?.url ?? null,
      language: item.language,
      difficulty: item.difficulty,
      isFree: true,
      status: "draft",
      source: "ai",
    };
  } catch (err) {
    warnings.push(
      `YouTube API search failed; saved YouTube search URL instead. ${
        err instanceof Error ? err.message : String(err)
      }`,
    );
    return null;
  }
}

function youtubeSearchResource(item: SearchPlanItem): LearningResourceInput {
  return {
    title: `Review YouTube search: ${item.query}`,
    url: searchUrl("YouTube", item.query),
    platform: "YouTube",
    resourceType: "YouTube Video",
    description:
      item.description +
      " Admin should review the search results and optionally replace this with a specific video or playlist before publishing.",
    thumbnailUrl: null,
    language: item.language,
    difficulty: item.difficulty,
    isFree: true,
    status: "draft",
    source: "ai",
  };
}

function platformSearchResource(item: SearchPlanItem): LearningResourceInput {
  return {
    title: `${TRUSTED_PLATFORM_LABELS[item.platform]} search: ${item.query}`,
    url: searchUrl(item.platform, item.query),
    platform: TRUSTED_PLATFORM_LABELS[item.platform],
    resourceType: item.resourceType,
    description: item.description,
    thumbnailUrl: null,
    language: item.language,
    difficulty: item.difficulty,
    isFree: true,
    status: "draft",
    source: "ai",
  };
}

function searchUrl(platform: z.infer<typeof SearchPlatform>, query: string): string {
  const encoded = encodeURIComponent(query);
  switch (platform) {
    case "YouTube":
      return `https://www.youtube.com/results?search_query=${encoded}`;
    case "SWAYAM":
      return `https://swayam.gov.in/explorer?searchText=${encoded}`;
    case "NPTEL":
      return `https://nptel.ac.in/courses?search=${encoded}`;
    case "freeCodeCamp":
      return `https://www.freecodecamp.org/news/search/?query=${encoded}`;
    case "GeeksforGeeks":
      return `https://www.geeksforgeeks.org/?s=${encoded}`;
    case "Khan Academy":
      return `https://www.khanacademy.org/search?page_search_query=${encoded}`;
    case "MDN":
      return `https://developer.mozilla.org/en-US/search?q=${encoded}`;
    case "Coursera":
      return `https://www.coursera.org/search?query=${encoded}`;
  }
}

function dedupeByUrl(resources: LearningResourceInput[]): LearningResourceInput[] {
  const seen = new Set<string>();
  return resources.filter((resource) => {
    if (seen.has(resource.url)) return false;
    seen.add(resource.url);
    return true;
  });
}

function isTechnicalCourse(course: CourseContext): boolean {
  return hasAny(course, [
    "computer",
    "software",
    "data",
    "artificial intelligence",
    "engineering",
    "digital",
    "technology",
    "application",
  ]);
}

function hasAny(course: CourseContext, needles: string[]): boolean {
  const haystack = `${course.courseName} ${course.stream} ${course.careerClusters.join(" ")} ${
    course.description
  }`.toLowerCase();
  return needles.some((needle) => haystack.includes(needle));
}

type YouTubeSearchResponse = {
  items?: Array<{
    id: { videoId?: string };
    snippet: {
      title: string;
      thumbnails: {
        default?: { url: string };
        medium?: { url: string };
      };
    };
  }>;
};
