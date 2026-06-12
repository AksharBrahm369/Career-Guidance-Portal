// Pure course status-transition matrix (docs/KNOWLEDGE_BASE.md §5).
// No "server-only": this is pure logic, imported by both API routes and
// client components (for error formatting), and exercised by vitest.

export const COURSE_STATUSES = [
  "draft",
  "pending_review",
  "published",
  "archived",
  "rejected",
] as const;

export type CourseStatus = (typeof COURSE_STATUSES)[number];

/**
 * The only legal lifecycle transitions:
 *   draft → pending_review → published | rejected
 *   published ⇄ archived (archive / restore)
 *   rejected → pending_review (reopen)
 */
export const TRANSITIONS = {
  publish: { from: "pending_review", to: "published" },
  reject: { from: "pending_review", to: "rejected" },
  archive: { from: "published", to: "archived" },
  reopen: { from: "rejected", to: "pending_review" },
  restore: { from: "archived", to: "published" },
} as const satisfies Record<string, { from: CourseStatus; to: CourseStatus }>;

export type CourseTransitionAction = keyof typeof TRANSITIONS;

export interface InvalidTransitionBody {
  error: "invalid_transition";
  action: CourseTransitionAction;
  expected: CourseStatus;
  actual: CourseStatus;
}

export type TransitionResult =
  | { ok: true; to: CourseStatus }
  | { ok: false; body: InvalidTransitionBody };

/** Returns ok+target status, or the 409 JSON body for an invalid transition. */
export function checkTransition(
  action: CourseTransitionAction,
  actual: CourseStatus,
): TransitionResult {
  const { from, to } = TRANSITIONS[action];
  if (actual === from) return { ok: true, to };
  return {
    ok: false,
    body: { error: "invalid_transition", action, expected: from, actual },
  };
}

/** Human-readable message for admin UI error surfaces. */
export function formatInvalidTransition(body: InvalidTransitionBody): string {
  return `Cannot ${body.action}: course is "${body.actual}" but must be "${body.expected}". Refresh the page to see its current state.`;
}
