import { describe, expect, it } from "vitest";
import { normalizeCourseClusterKeys } from "@/lib/recommendation/catalogue";

describe("normalizeCourseClusterKeys", () => {
  const clusters = [
    { key: "engineering-technology", name: "Engineering & Technology" },
    { key: "healthcare-life-sciences", name: "Healthcare & Life Sciences" },
  ];

  it("maps course cluster display names to engine keys", () => {
    expect(
      normalizeCourseClusterKeys(
        ["Engineering & Technology", "healthcare-life-sciences", "Unknown"],
        clusters,
      ),
    ).toEqual(["engineering-technology", "healthcare-life-sciences", "Unknown"]);
  });
});
