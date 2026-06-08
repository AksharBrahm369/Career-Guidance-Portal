import { Suspense } from "react";
import Link from "next/link";
import { Compass, SearchX } from "lucide-react";
import { CatalogueFilters } from "@/components/student/catalogue-filters";
import { CourseCard } from "@/components/student/course-card";
import { Pagination } from "@/components/pagination";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
  EmptyContent,
} from "@/components/ui/empty";
import { Skeleton } from "@/components/ui/skeleton";
import {
  listPublishedCourses,
  type AiSafetyFilter,
  type StreamFilter,
} from "@/lib/student/courses";

export const dynamic = "force-dynamic";

const STREAMS = ["science", "commerce", "arts", "vocational"] as const;
const TAGS = ["ai_safe", "ai_augmented", "ai_risk"] as const;

interface PageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

function pickStream(v: unknown): StreamFilter | undefined {
  return typeof v === "string" && (STREAMS as readonly string[]).includes(v)
    ? (v as StreamFilter)
    : undefined;
}

function pickSafety(v: unknown): AiSafetyFilter | undefined {
  return typeof v === "string" && (TAGS as readonly string[]).includes(v)
    ? (v as AiSafetyFilter)
    : undefined;
}

export default async function CoursesCataloguePage({ searchParams }: PageProps) {
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q : undefined;
  const stream = pickStream(sp.stream);
  const aiSafety = pickSafety(sp.ai);
  const cluster = typeof sp.cluster === "string" ? sp.cluster : undefined;
  const page = typeof sp.page === "string" ? Number(sp.page) || 1 : 1;

  // A key that changes whenever the filters change, so Suspense re-suspends
  // (and shows the skeleton) on every new query.
  const resultsKey = `${q ?? ""}|${stream ?? ""}|${aiSafety ?? ""}|${cluster ?? ""}|${page}`;

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-1.5">
        <h1 className="font-heading text-2xl font-bold tracking-tight sm:text-3xl">
          Explore courses
        </h1>
        <p className="text-pretty text-sm text-muted-foreground sm:text-base">
          Browse paths across every stream. Open any course to see where it&apos;s
          taught, what it costs, and ask anything you&apos;re curious about.
        </p>
      </header>

      <CatalogueFilters />

      <Suspense key={resultsKey} fallback={<ResultsSkeleton />}>
        <Results
          q={q}
          stream={stream}
          aiSafety={aiSafety}
          cluster={cluster}
          page={page}
        />
      </Suspense>
    </div>
  );
}

async function Results({
  q,
  stream,
  aiSafety,
  cluster,
  page,
}: {
  q?: string;
  stream?: StreamFilter;
  aiSafety?: AiSafetyFilter;
  cluster?: string;
  page: number;
}) {
  const data = await listPublishedCourses({ q, stream, aiSafety, cluster, page });

  const hrefForPage = (target: number) => {
    const out = new URLSearchParams();
    if (q) out.set("q", q);
    if (stream) out.set("stream", stream);
    if (aiSafety) out.set("ai", aiSafety);
    if (cluster) out.set("cluster", cluster);
    if (target > 1) out.set("page", String(target));
    const s = out.toString();
    return `/courses${s ? `?${s}` : ""}`;
  };

  if (data.rows.length === 0) {
    return (
      <Empty className="border bg-card">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <SearchX />
          </EmptyMedia>
          <EmptyTitle>No matches yet</EmptyTitle>
          <EmptyDescription>
            We couldn&apos;t find a course for these filters. Try a different
            stream or clear your filters to see everything.
          </EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <Button asChild variant="outline">
            <Link href="/courses">
              <Compass data-icon="inline-start" />
              Browse all courses
            </Link>
          </Button>
        </EmptyContent>
      </Empty>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <p
        className="text-sm text-muted-foreground"
        role="status"
        aria-live="polite"
      >
        <span className="font-medium text-foreground tabular-nums">
          {data.total}
        </span>{" "}
        course{data.total === 1 ? "" : "s"} found
      </p>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {data.rows.map((row) => (
          <CourseCard
            key={row.id}
            slug={row.slug}
            courseName={row.courseName}
            stream={row.stream}
            aiSafetyTag={row.aiSafetyTag}
            shortDescription={row.shortDescription}
            tenureYears={row.tenureYears}
            careerClusters={row.careerClusters}
            instituteCount={row.instituteCount}
          />
        ))}
      </div>

      <Pagination
        page={data.page}
        pageCount={data.pageCount}
        hrefForPage={hrefForPage}
        className="mt-2"
      />
    </div>
  );
}

function ResultsSkeleton() {
  return (
    <div className="flex flex-col gap-4">
      <Skeleton className="h-5 w-32" />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="flex min-h-[11rem] flex-col gap-3 rounded-lg border bg-card p-4 shadow-sm"
          >
            <Skeleton className="h-5 w-3/4" />
            <div className="flex gap-1.5">
              <Skeleton className="h-5 w-16 rounded-full" />
              <Skeleton className="h-5 w-20 rounded-full" />
            </div>
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
            <div className="mt-auto flex gap-4 pt-1">
              <Skeleton className="h-4 w-12" />
              <Skeleton className="h-4 w-20" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
