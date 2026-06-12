import { describe, expect, it } from "vitest";
import {
  COURSE_STATUSES,
  TRANSITIONS,
  checkTransition,
  formatInvalidTransition,
  type CourseStatus,
  type CourseTransitionAction,
} from "@/lib/admin/course-transitions";

// The documented lifecycle (docs/KNOWLEDGE_BASE.md §5):
//   draft → pending_review → published | rejected
//   published ⇄ archived (archive / restore)
//   rejected → pending_review (reopen)
const EXPECTED: Record<CourseTransitionAction, { from: CourseStatus; to: CourseStatus }> = {
  publish: { from: "pending_review", to: "published" },
  reject: { from: "pending_review", to: "rejected" },
  archive: { from: "published", to: "archived" },
  reopen: { from: "rejected", to: "pending_review" },
  restore: { from: "archived", to: "published" },
};

describe("TRANSITIONS matrix", () => {
  it("matches the documented lifecycle exactly", () => {
    expect(TRANSITIONS).toEqual(EXPECTED);
  });
});

describe("checkTransition — every action × every status", () => {
  for (const action of Object.keys(EXPECTED) as CourseTransitionAction[]) {
    const { from, to } = EXPECTED[action];

    for (const status of COURSE_STATUSES) {
      if (status === from) {
        it(`${action}: allowed from ${status} → ${to}`, () => {
          const result = checkTransition(action, status);
          expect(result).toEqual({ ok: true, to });
        });
      } else {
        it(`${action}: rejected from ${status} (409 body has expected/actual)`, () => {
          const result = checkTransition(action, status);
          expect(result).toEqual({
            ok: false,
            body: {
              error: "invalid_transition",
              action,
              expected: from,
              actual: status,
            },
          });
        });
      }
    }
  }
});

describe("formatInvalidTransition", () => {
  it("produces a human-readable message for the UI", () => {
    const result = checkTransition("publish", "rejected");
    if (result.ok) throw new Error("expected failure");
    expect(formatInvalidTransition(result.body)).toBe(
      'Cannot publish: course is "rejected" but must be "pending_review". Refresh the page to see its current state.',
    );
  });
});
