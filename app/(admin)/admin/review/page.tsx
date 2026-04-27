import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { courses } from "@/db/schema";
import { ReviewCard } from "@/components/admin/review-card";

export const dynamic = "force-dynamic";

export default async function AdminReviewPage() {
  const rows = await db
    .select()
    .from(courses)
    .where(eq(courses.status, "pending_review"))
    .orderBy(desc(courses.createdAt))
    .limit(25);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Review Queue</h1>
          <p className="text-sm text-muted-foreground">
            {rows.length === 0
              ? "Nothing to review."
              : `${rows.length} course${rows.length === 1 ? "" : "s"} awaiting review.`}
          </p>
        </div>
        <div className="flex gap-2 text-sm">
          <Link href="/admin" className="rounded-md border px-3 py-1.5">
            ← Dashboard
          </Link>
          <Link
            href="/admin/fetch"
            className="rounded-md bg-primary px-3 py-1.5 text-primary-foreground"
          >
            New AI Fetch
          </Link>
          <Link href="/admin/courses/new" className="rounded-md border px-3 py-1.5">
            + Add manually
          </Link>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        {rows.map((course) => (
          <ReviewCard
            key={course.id}
            course={{
              id: course.id,
              slug: course.slug,
              courseName: course.courseName,
              stream: course.stream,
              aiSafetyTag: course.aiSafetyTag,
              aiSafetyReasoning: course.aiSafetyReasoning,
              description: course.description,
              tenureYears: course.tenureYears,
              eligibilityCriteria: course.eligibilityCriteria,
              careerClusters: course.careerClusters,
              entranceExams: course.entranceExams,
              feesMinInr: course.feesMinInr,
              feesMaxInr: course.feesMaxInr,
              source: course.source,
              createdAt: course.createdAt,
            }}
          />
        ))}
      </div>
    </div>
  );
}
