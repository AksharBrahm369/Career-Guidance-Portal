"use client";

import Link from "next/link";
import { useState } from "react";
import { Loader2 } from "lucide-react";
import { LearningResourcesManager } from "@/components/admin/learning-resources-manager";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

interface FetchedCourse {
  courseId: string;
  slug: string;
  provider: string;
  warnings: string[];
  course: {
    courseName: string;
    stream: string;
    aiSafetyTag: string;
    description: string;
    tenureYears: number;
    careerClusters: string[];
    institutes: Array<{ name: string; city: string; state: string }>;
  };
}

interface SingleResponse extends FetchedCourse {
  mode: "single";
}

interface BatchResponse {
  mode: "batch";
  total: number;
  failures: string[];
  courses: FetchedCourse[];
}

type FetchResponse = SingleResponse | BatchResponse;

function CourseCard({ item, index }: { item: FetchedCourse; index?: number }) {
  const learningSearchUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(
    `${item.course.courseName} beginner course tutorial`,
  )}`;

  return (
    <div className="flex flex-col gap-3 rounded-lg border bg-card p-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          {index !== undefined && (
            <div className="mb-0.5 text-xs font-semibold text-muted-foreground">#{index + 1}</div>
          )}
          <div className="text-xs text-muted-foreground">via {item.provider}</div>
          <h2 className="text-xl font-semibold">{item.course.courseName}</h2>
          <div className="mt-1 flex flex-wrap gap-1.5 text-xs">
            <span className="rounded bg-muted px-2 py-0.5">{item.course.stream}</span>
            <span className="rounded bg-muted px-2 py-0.5">{item.course.aiSafetyTag}</span>
            <span className="rounded bg-muted px-2 py-0.5">{item.course.tenureYears} yrs</span>
          </div>
        </div>
        <div className="flex shrink-0 flex-wrap justify-end gap-1.5">
          <LearningResourcesManager courseId={item.courseId} courseName={item.course.courseName} />
          <Link
            href="/admin/review"
            className="rounded-md bg-primary px-3 py-1.5 text-xs text-primary-foreground"
          >
            Open in Review Queue
          </Link>
        </div>
      </div>

      {item.warnings.length > 0 ? (
        <div className="rounded border border-orange-400/40 bg-orange-400/5 p-2 text-xs text-orange-700">
          {item.warnings.map((warning, i) => (
            <div key={i}>Warning: {warning}</div>
          ))}
        </div>
      ) : null}

      <p className="text-sm">{item.course.description}</p>

      <div className="rounded-md border bg-muted/30 p-3 text-sm">
        <div className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Learning link
        </div>
        <a
          href={learningSearchUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="font-medium text-primary underline-offset-4 hover:underline"
        >
          Open YouTube learning search for this course
        </a>
      </div>

      <div className="text-xs text-muted-foreground">Career clusters</div>
      <div className="flex flex-wrap gap-1.5">
        {item.course.careerClusters.map((cluster) => (
          <span key={cluster} className="rounded bg-secondary px-2 py-0.5 text-xs">
            {cluster}
          </span>
        ))}
      </div>

      <div className="text-xs text-muted-foreground">
        {item.course.institutes.length} institutes
      </div>
      <ul className="space-y-1 text-sm">
        {item.course.institutes.slice(0, 5).map((inst) => (
          <li key={`${inst.name}-${inst.city}`}>
            {inst.name} - {inst.city}, {inst.state}
          </li>
        ))}
        {item.course.institutes.length > 5 ? (
          <li className="text-xs text-muted-foreground">
            +{item.course.institutes.length - 5} more
          </li>
        ) : null}
      </ul>

      <div className="text-xs text-muted-foreground">
        Saved as <code>pending_review</code>. Add learning resources, then review &amp; publish from
        the queue.
      </div>
    </div>
  );
}

export function FetchManager() {
  const [query, setQuery] = useState("");
  const [override, setOverride] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [response, setResponse] = useState<FetchResponse | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!query.trim() || loading) return;
    setLoading(true);
    setError(null);
    setResponse(null);

    try {
      const res = await fetch("/api/admin/fetch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: query.trim(), override }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.message ?? data.error ?? `HTTP ${res.status}`);
        return;
      }
      setResponse(data as FetchResponse);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

  const isBatch = response?.mode === "batch";
  const courses: FetchedCourse[] =
    response == null
      ? []
      : isBatch
        ? (response as BatchResponse).courses
        : [response as SingleResponse];

  return (
    <div className="flex flex-col gap-6">
      <form onSubmit={onSubmit} className="flex flex-col gap-3 rounded-lg border bg-card p-4">
        <label className="flex flex-col gap-1 text-sm font-medium">
          Query
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder='e.g. "Marine Biology" or "All BSc IT courses"'
            className="rounded-md border border-input bg-background px-3 py-2 text-sm font-normal"
            required
            minLength={2}
            maxLength={200}
            disabled={loading}
          />
        </label>

        <div className="flex flex-wrap gap-3">
          <label className="flex items-center gap-2 self-end text-xs">
            <input
              type="checkbox"
              checked={override}
              onChange={(e) => setOverride(e.target.checked)}
              disabled={loading}
            />
            Override exclusion list (allow duplicates)
          </label>
        </div>

        <Button
          type="submit"
          disabled={loading || query.trim().length < 2}
          className="self-start"
          aria-busy={loading}
        >
          {loading ? (
            <>
              <Loader2 className="animate-spin" aria-hidden="true" />
              Fetching all matches with AI...
            </>
          ) : (
            "Fetch all matches with AI"
          )}
        </Button>
      </form>

      {loading ? <FetchLoadingSkeleton /> : null}

      {error ? (
        <div className="rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">
          {error}
        </div>
      ) : null}

      {isBatch && response ? (
        <div className="flex items-center gap-3 rounded-md border bg-muted/40 px-4 py-2 text-sm">
          <span className="font-semibold">
            {(response as BatchResponse).total} course
            {(response as BatchResponse).total !== 1 ? "s" : ""} fetched &amp; saved
          </span>
          {(response as BatchResponse).failures.length > 0 && (
            <span className="text-orange-700">
              - {(response as BatchResponse).failures.length} iteration
              {(response as BatchResponse).failures.length !== 1 ? "s" : ""} failed
            </span>
          )}
          <Link href="/admin/review" className="ml-auto text-xs underline">
            Open Review Queue
          </Link>
        </div>
      ) : null}

      {isBatch && (response as BatchResponse).failures.length > 0 ? (
        <div className="rounded-md border border-orange-400/40 bg-orange-400/5 p-3 text-xs text-orange-700">
          <div className="mb-1 font-semibold">Failed iterations:</div>
          {(response as BatchResponse).failures.map((failure, i) => (
            <div key={i}>Warning: {failure}</div>
          ))}
        </div>
      ) : null}

      {courses.map((item, idx) => (
        <CourseCard key={item.courseId} item={item} index={courses.length > 1 ? idx : undefined} />
      ))}
    </div>
  );
}

function FetchLoadingSkeleton() {
  return (
    <div
      className="flex flex-col gap-4 rounded-lg border bg-muted/20 p-4"
      role="status"
      aria-live="polite"
      aria-label="Fetching courses with AI"
    >
      <div className="flex items-center gap-3 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin text-primary" aria-hidden="true" />
        Finding relevant courses, checking duplicates, and saving review drafts...
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <div key={index} className="flex min-h-48 flex-col gap-3 rounded-lg border bg-card p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex flex-1 flex-col gap-2">
                <Skeleton className="h-3 w-16" />
                <Skeleton className="h-6 w-4/5" />
              </div>
              <Skeleton className="h-8 w-24" />
            </div>
            <div className="flex gap-2">
              <Skeleton className="h-5 w-16 rounded-full" />
              <Skeleton className="h-5 w-20 rounded-full" />
              <Skeleton className="h-5 w-14 rounded-full" />
            </div>
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-11/12" />
            <Skeleton className="h-4 w-2/3" />
            <div className="mt-auto flex flex-col gap-2">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-4 w-40" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
