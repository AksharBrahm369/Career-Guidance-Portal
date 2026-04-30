import Link from "next/link";
import { Pagination } from "@/components/pagination";
import { ReviewCard } from "@/components/admin/review-card";
import { listAdminCourses } from "@/lib/admin/courses-list";

export const dynamic = "force-dynamic";

const PER_PAGE = 10;

interface PageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function AdminReviewPage({ searchParams }: PageProps) {
  const sp = await searchParams;
  const page = typeof sp.page === "string" ? Number(sp.page) || 1 : 1;
  const data = await listAdminCourses({ status: "pending_review", page, perPage: PER_PAGE });

  const hrefForPage = (target: number) =>
    target > 1 ? `/admin/review?page=${target}` : "/admin/review";

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Review Queue</h1>
          <p className="text-sm text-muted-foreground">
            {data.total === 0
              ? "Nothing to review."
              : `${data.total} course${data.total === 1 ? "" : "s"} awaiting review.`}
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
        {data.rows.map((course) => (
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
              sourceUrls: course.sourceUrls,
              source: course.source,
              createdAt: course.createdAt,
            }}
          />
        ))}
      </div>

      <Pagination page={data.page} pageCount={data.pageCount} hrefForPage={hrefForPage} />
    </div>
  );
}
