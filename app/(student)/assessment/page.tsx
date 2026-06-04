import { desc, eq } from "drizzle-orm";
import { requireStudent } from "@/lib/auth/require-student";
import { db } from "@/lib/db";
import { assessments } from "@/db/schema";
import { getActiveItems } from "@/lib/assessment/items";
import { AssessmentFlow } from "@/components/student/assessment/assessment-flow";
import { CapturedProfile } from "@/components/student/assessment/captured-profile";
import type { ClientItem } from "@/components/student/assessment/types";

export const runtime = "nodejs";

/**
 * Single-page assessment entry. Server component:
 * - resolves the student session (middleware already gates /assessment),
 * - loads the latest attempt + the three scored item sets in parallel,
 * - renders the captured profile if the latest attempt is completed,
 *   otherwise the resumable 4-module flow.
 *
 * SECURITY: question-bank rows carry answer keys (`correctOptionId`,
 * `scoringMap`). Those are stripped here — only `ClientItem` reaches the client.
 */
export default async function AssessmentEntryPage() {
  const { studentId } = await requireStudent();

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
    return (
      <CapturedProfile
        interestData={latest.interestData ?? {}}
        workStyleScores={latest.workStyleScores ?? {}}
        aptitudeScores={latest.aptitudeScores ?? {}}
        marks={latest.marks ?? null}
        confidence={(latest.confidence as "high" | "moderate" | "low" | null) ?? null}
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

  return (
    <AssessmentFlow
      attemptId={inProgress?.id ?? null}
      initialResponses={(inProgress?.responses as Record<string, unknown> | undefined) ?? {}}
      items={{
        interests: toClient(interestItems),
        work_style: toClient(workStyleItems),
        aptitude: toClient(aptitudeItems),
      }}
    />
  );
}
