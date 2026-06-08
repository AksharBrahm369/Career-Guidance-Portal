import Link from "next/link";
import { DownloadCloud, Plus } from "lucide-react";
import { Pagination } from "@/components/pagination";
import { ReviewCard } from "@/components/admin/review-card";
import { AdminPageHeader } from "@/components/admin/shell/page-header";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
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
    <div className="flex flex-col gap-6">
      <AdminPageHeader
        title="Review queue"
        description={
          data.total === 0
            ? "Nothing to review."
            : `${data.total} course${data.total === 1 ? "" : "s"} awaiting review.`
        }
        actions={
          <>
            <Button asChild variant="outline">
              <Link href="/admin/courses/new">
                <Plus data-icon="inline-start" />
                Add manually
              </Link>
            </Button>
            <Button asChild>
              <Link href="/admin/fetch">
                <DownloadCloud data-icon="inline-start" />
                New AI fetch
              </Link>
            </Button>
          </>
        }
      />

      {data.rows.length === 0 ? (
        <Alert>
          <AlertTitle>Queue is empty</AlertTitle>
          <AlertDescription>
            There are no courses awaiting review. Run an AI fetch to add more.
          </AlertDescription>
        </Alert>
      ) : (
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
      )}

      <Pagination page={data.page} pageCount={data.pageCount} hrefForPage={hrefForPage} />
    </div>
  );
}
