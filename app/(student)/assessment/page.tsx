import { redirect } from "next/navigation";
import { desc, eq } from "drizzle-orm";
import { requireStudent, StudentUnauthorizedError } from "@/lib/auth/require-student";
import { db } from "@/lib/db";
import { assessments } from "@/db/schema";
import { getActiveItems } from "@/lib/assessment/items";
import { isLowSignal } from "@/lib/recommendation";
import { AssessmentFlow } from "@/components/student/assessment/assessment-flow";
import { CapturedProfile } from "@/components/student/assessment/captured-profile";
import type { ClientItem } from "@/components/student/assessment/types";

export const runtime = "nodejs";

/**
 * Single-page assessment entry. Server component:
 * - resolves the student session (middleware already gates /assessment),
 * - loads the latest attempt + the three scored item sets in parallel,
 * - renders the captured profile if the latest attempt is completed,
 *   otherwise the resumable 5-module flow (interests, work_style, aptitude,
 *   subjects, marks).
 *
 * SECURITY: question-bank rows carry answer keys (`correctOptionId`,
 * `scoringMap`). Those are stripped here — only `ClientItem` reaches the client.
 */
export default async function AssessmentEntryPage() {
  // requireStudent() THROWS on a missing/expired session or a wrong-role (e.g.
  // admin) session. Middleware only checks cookie *presence*, so a stale cookie
  // reaches here — catch the auth error and redirect to login rather than
  // rendering the global error boundary (mirrors the admin layout's pattern).
  let studentId: string;
  try {
    ({ studentId } = await requireStudent());
  } catch (err) {
    if (err instanceof StudentUnauthorizedError) redirect("/student/login");
    throw err;
  }

  const [latest, interestItems, workStyleItems, aptitudeItems] = await Promise.all([
    db.query.assessments.findFirst({
      where: eq(assessments.studentId, studentId),
      orderBy: desc(assessments.startedAt),
    }),
    getActiveItems("interests"),
    getActiveItems("work_style"),
    getActiveItems("aptitude"),
  ]);

  if (latest && latest.status === "completed") {
    const confidence = (latest.confidence as "high" | "moderate" | "low" | null) ?? null;
    const recommendedCourses = latest.recommendedCourses ?? [];
    return (
      <CapturedProfile
        interestData={latest.interestData ?? {}}
        workStyleScores={latest.workStyleScores ?? {}}
        aptitudeScores={latest.aptitudeScores ?? {}}
        subjectAffinities={latest.subjectAffinities ?? {}}
        marks={latest.marks ?? null}
        confidence={confidence}
        clusterScores={latest.clusterScores ?? []}
        recommendedCourses={recommendedCourses}
        lowSignal={isLowSignal(recommendedCourses, confidence)}
      />
    );
  }

  const toClient = (rows: Awaited<ReturnType<typeof getActiveItems>>): ClientItem[] =>
    rows.map((r) => ({
      id: r.id,
      dimension: r.dimension,
      questionText: r.questionText,
      options: r.options,
      media: r.media ?? null,
    }));

  const inProgress = latest && latest.status === "in_progress" ? latest : null;

  // The wizard reads best in a comfortable single-column measure, narrower than
  // the page's max-w-5xl (which the results view uses for its rich course cards).
  return (
    <div className="mx-auto w-full max-w-2xl">
      <AssessmentFlow
        attemptId={inProgress?.id ?? null}
        initialResponses={(inProgress?.responses as Record<string, unknown> | undefined) ?? {}}
        items={{
          interests: toClient(interestItems),
          work_style: toClient(workStyleItems),
          aptitude: toClient(aptitudeItems),
        }}
      />
    </div>
  );
}
