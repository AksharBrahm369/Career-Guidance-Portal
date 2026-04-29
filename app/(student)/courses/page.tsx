import Link from "next/link";
import { CatalogueFilters } from "@/components/student/catalogue-filters";
import { CourseCard } from "@/components/student/course-card";
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

  const data = await listPublishedCourses({ q, stream, aiSafety, cluster, page });

  const queryString = (override: Record<string, string | null>) => {
    const out = new URLSearchParams();
    if (q) out.set("q", q);
    if (stream) out.set("stream", stream);
    if (aiSafety) out.set("ai", aiSafety);
    if (cluster) out.set("cluster", cluster);
    for (const [k, v] of Object.entries(override)) {
      if (v == null) out.delete(k);
      else out.set(k, v);
    }
    const s = out.toString();
    return s ? `?${s}` : "";
  };

  return (
    <div className="flex flex-col gap-4">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold">Course Catalogue</h1>
        <p className="text-sm text-muted-foreground">
          {data.total === 0
            ? "No published courses match your filters."
            : `${data.total} published course${data.total === 1 ? "" : "s"}.`}
        </p>
      </header>

      <CatalogueFilters />

      {data.rows.length === 0 ? (
        <div className="rounded-md border bg-card p-8 text-center text-sm text-muted-foreground">
          Nothing here yet. Try clearing your filters.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
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
      )}

      {data.pageCount > 1 ? (
        <nav className="mt-2 flex items-center justify-between text-sm" aria-label="Pagination">
          {data.page > 1 ? (
            <Link
              href={`/courses${queryString({ page: String(data.page - 1) })}`}
              className="rounded-md border px-3 py-1.5"
            >
              ← Previous
            </Link>
          ) : (
            <span />
          )}
          <span className="text-xs text-muted-foreground">
            Page {data.page} / {data.pageCount}
          </span>
          {data.page < data.pageCount ? (
            <Link
              href={`/courses${queryString({ page: String(data.page + 1) })}`}
              className="rounded-md border px-3 py-1.5"
            >
              Next →
            </Link>
          ) : (
            <span />
          )}
        </nav>
      ) : null}
    </div>
  );
}
