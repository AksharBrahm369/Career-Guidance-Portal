import { describe, expect, it } from "vitest";
import { processMarks } from "@/lib/assessment/scoring/marks";

describe("processMarks", () => {
  it("keeps board/stream and ranks subject strengths desc", () => {
    const r = processMarks({
      board: "CBSE",
      stream: "science",
      subjects: { Physics: 92, Math: 88, English: 70 },
    });
    expect(r.board).toBe("CBSE");
    expect(r.stream).toBe("science");
    expect(r.strengths).toEqual(["Physics", "Math", "English"]);
  });

  it("does not normalize — raw marks are preserved", () => {
    const r = processMarks({ board: "HPBOSE", stream: "commerce", subjects: { Accounts: 55 } });
    expect(r.subjects.Accounts).toBe(55);
    expect(r.strengths).toEqual(["Accounts"]);
  });
});
