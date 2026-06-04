import { marksAggregate } from "./normalize";
import type { CourseInput, StudentProfile } from "./types";

export type EligibilityResult = { eligible: boolean; crossStream: boolean; reasons: string[] };

/**
 * Non-compensatory eligibility gate (§5.3). Hard subject/marks constraints
 * eliminate a course; a stream mismatch does NOT eliminate (§5.7 — cross-stream
 * options are surfaced with a caveat), it only sets `crossStream`.
 */
export function evaluateEligibility(student: StudentProfile, course: CourseInput): EligibilityResult {
  const reasons: string[] = [];
  const subjects = student.marks?.subjects ?? {};
  const elig = course.eligibility;

  // Hard: required stream subjects must be present in the student's reported marks.
  for (const s of elig?.requiredStreamSubjects ?? []) {
    if (subjects[s] == null) {
      return { eligible: false, crossStream: false, reasons: [`Requires ${s}, which you didn't report`] };
    }
  }
  // Hard: per-subject minimums.
  for (const [s, min] of Object.entries(elig?.minBySubject ?? {})) {
    if ((subjects[s] ?? -1) < min) {
      return { eligible: false, crossStream: false, reasons: [`Needs at least ${min}% in ${s}`] };
    }
  }
  // Hard: aggregate minimum (board-aware reference; raw, no normalization).
  if (elig?.minAggregate != null && marksAggregate(student.marks) * 100 < elig.minAggregate) {
    return { eligible: false, crossStream: false, reasons: [`Needs about ${elig.minAggregate}% aggregate`] };
  }

  const crossStream = student.knownStream != null && course.stream !== student.knownStream;
  if (crossStream) reasons.push(`Cross-stream from ${student.knownStream} — check the entrance route`);
  return { eligible: true, crossStream, reasons };
}
