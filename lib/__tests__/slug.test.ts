import { describe, expect, it } from "vitest";
import { slugify, uniqueSlug } from "@/lib/slug";

describe("slugify", () => {
  it("lowercases and dasherizes ASCII", () => {
    expect(slugify("Marine Biology")).toBe("marine-biology");
    expect(slugify("  B.Sc.  Computer Science!! ")).toBe("b-sc-computer-science");
  });

  it("returns empty string for purely non-ASCII input (handled by uniqueSlug)", () => {
    expect(slugify("नई दिल्ली")).toBe("");
  });

  it("clamps to 80 chars", () => {
    const long = "a".repeat(120);
    expect(slugify(long).length).toBe(80);
  });
});

describe("uniqueSlug", () => {
  it("returns the slug as-is when unused", () => {
    expect(uniqueSlug("Hello World", new Set())).toBe("hello-world");
  });

  it("appends -2, -3, ... on collision", () => {
    const used = new Set(["foo", "foo-2", "foo-3"]);
    expect(uniqueSlug("foo", used)).toBe("foo-4");
  });

  it("never returns an empty slug, even for non-ASCII names", () => {
    const out = uniqueSlug("नई दिल्ली", new Set());
    expect(out.length).toBeGreaterThan(0);
    expect(out.startsWith("entry-")).toBe(true);
  });
});
