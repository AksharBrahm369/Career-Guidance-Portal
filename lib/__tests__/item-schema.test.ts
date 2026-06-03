import { describe, expect, it } from "vitest";
import { ImportItem } from "@/lib/admin/question-bank/item-schema";

const base = { dimension: "numerical", questionText: "2 + 2 = ?", options: [{ id: "a", text: "3" }, { id: "b", text: "4" }] };

describe("ImportItem", () => {
  it("accepts an aptitude item with a correct option", () => {
    const r = ImportItem.safeParse({ ...base, module: "aptitude", correctOptionId: "b", source: "SANDIA" });
    expect(r.success).toBe(true);
  });

  it("rejects an aptitude item missing the answer key", () => {
    const r = ImportItem.safeParse({ ...base, module: "aptitude", source: "SANDIA" });
    expect(r.success).toBe(false);
  });

  it("rejects an aptitude item whose correctOptionId is not an option id", () => {
    const r = ImportItem.safeParse({ ...base, module: "aptitude", correctOptionId: "z", source: "SANDIA" });
    expect(r.success).toBe(false);
  });

  it("requires a scoringMap for interests items", () => {
    const ok = ImportItem.safeParse({ ...base, module: "interests", scoringMap: { a: { R: 1 } }, source: "ONET_IP" });
    const bad = ImportItem.safeParse({ ...base, module: "interests", source: "ONET_IP" });
    expect(ok.success).toBe(true);
    expect(bad.success).toBe(false);
  });
});
