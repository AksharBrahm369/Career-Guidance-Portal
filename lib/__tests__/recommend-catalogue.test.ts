import { describe, expect, it } from "vitest";
import { normalizeCourseClusterKeys } from "@/lib/recommendation/catalogue";

describe("normalizeCourseClusterKeys", () => {
  const clusters = [
    { key: "engineering-technology", name: "Engineering & Technology" },
    { key: "healthcare-life-sciences", name: "Healthcare & Life Sciences" },
    { key: "commerce-management", name: "Commerce & Management" },
  ];

  it("maps course cluster display names to engine keys", () => {
    expect(
      normalizeCourseClusterKeys(
        ["Engineering & Technology", "healthcare-life-sciences", "Unknown"],
        clusters,
      ),
    ).toEqual(["engineering-technology", "healthcare-life-sciences", "Unknown"]);
  });

  it("maps common live fetched cluster labels onto starter cluster keys", () => {
    expect(
      normalizeCourseClusterKeys(
        ["Software Development", "IT & Systems", "Management & Administration"],
        clusters,
      ),
    ).toEqual(["engineering-technology", "commerce-management"]);
  });
});
