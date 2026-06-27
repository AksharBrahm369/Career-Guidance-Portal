import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/ai/client", () => ({
  getModel: () => {
    throw new Error("AI disabled in test");
  },
}));

vi.mock("@/lib/url-verify", () => ({
  verifyUrls: async (urls: string[]) => ({
    ok: urls,
    dead: [],
    unknown: [],
    results: urls.map((url) => ({ url, status: "ok" })),
  }),
}));

import { fetchLearningResourceDrafts } from "@/lib/ai/learning-resources";

describe("fetchLearningResourceDrafts", () => {
  it("falls back to safe draft search URLs when AI and YouTube API are unavailable", async () => {
    vi.stubEnv("YOUTUBE_API_KEY", "");

    const result = await fetchLearningResourceDrafts({
      courseName: "B.Tech in Data Science",
      stream: "science",
      careerClusters: ["Engineering & Technology"],
      description:
        "A course covering Python, statistics, machine learning, databases, and applied analytics for beginners.",
    });

    expect(result.provider).toBe("fallback search plan");
    expect(result.warnings.join(" ")).toContain("fallback queries");
    expect(result.resources).toHaveLength(5);
    expect(result.resources.every((resource) => resource.status === "draft")).toBe(true);
    expect(result.resources.every((resource) => resource.source === "ai")).toBe(true);
    expect(result.resources.every((resource) => resource.isFree)).toBe(true);
    expect(result.resources.every((resource) => resource.url.startsWith("https://"))).toBe(true);
    expect(result.resources.some((resource) => resource.url.includes("youtube.com/results"))).toBe(
      true,
    );
    expect(result.resources.some((resource) => resource.url.includes("watch?v="))).toBe(false);
  });
});
