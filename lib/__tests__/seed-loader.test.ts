import { describe, expect, it } from "vitest";
import { toInsertRows } from "@/lib/admin/question-bank/seed-loader";

describe("toInsertRows", () => {
  it("maps a valid aptitude item to a question_bank row", () => {
    const rows = toInsertRows([
      {
        module: "aptitude",
        dimension: "numerical",
        questionText: "2 + 2 = ?",
        options: [{ id: "a", text: "3" }, { id: "b", text: "4" }],
        correctOptionId: "b",
        source: "SANDIA",
        version: 1,
      },
    ]);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ module: "aptitude", correctOptionId: "b", source: "SANDIA", isActive: true });
    expect(rows[0]?.scoringMap).toBeNull();
  });

  it("throws on an invalid item (missing answer key)", () => {
    expect(() =>
      toInsertRows([{ module: "aptitude", dimension: "numerical", questionText: "x", options: [{ id: "a", text: "1" }, { id: "b", text: "2" }], source: "SANDIA" } as never]),
    ).toThrow();
  });
});
