"use client";

import Link from "next/link";
import { useState } from "react";

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
  return (
    <div className="flex flex-col gap-3 rounded-lg border bg-card p-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          {index !== undefined && (
            <div className="mb-0.5 text-xs font-semibold text-muted-foreground">
              #{index + 1}
            </div>
          )}
          <div className="text-xs text-muted-foreground">via {item.provider}</div>
          <h2 className="text-xl font-semibold">{item.course.courseName}</h2>
          <div className="mt-1 flex flex-wrap gap-1.5 text-xs">
            <span className="rounded bg-muted px-2 py-0.5">{item.course.stream}</span>
            <span className="rounded bg-muted px-2 py-0.5">{item.course.aiSafetyTag}</span>
            <span className="rounded bg-muted px-2 py-0.5">{item.course.tenureYears} yrs</span>
          </div>
        </div>
        <Link
          href="/admin/review"
          className="shrink-0 rounded-md bg-primary px-3 py-1.5 text-xs text-primary-foreground"
        >
          Open in Review Queue
        </Link>
      </div>

      {item.warnings.length > 0 ? (
        <div className="rounded border border-orange-400/40 bg-orange-400/5 p-2 text-xs text-orange-700">
          {item.warnings.map((w, i) => (
            <div key={i}>⚠ {w}</div>
          ))}
        </div>
      ) : null}

      <p className="text-sm">{item.course.description}</p>

      <div className="text-xs text-muted-foreground">Career clusters</div>
      <div className="flex flex-wrap gap-1.5">
        {item.course.careerClusters.map((c) => (
          <span key={c} className="rounded bg-secondary px-2 py-0.5 text-xs">
            {c}
          </span>
        ))}
      </div>

      <div className="text-xs text-muted-foreground">{item.course.institutes.length} institutes</div>
      <ul className="space-y-1 text-sm">
        {item.course.institutes.slice(0, 5).map((inst) => (
          <li key={`${inst.name}-${inst.city}`}>
            {inst.name} — {inst.city}, {inst.state}
          </li>
        ))}
        {item.course.institutes.length > 5 ? (
          <li className="text-xs text-muted-foreground">
            +{item.course.institutes.length - 5} more
          </li>
        ) : null}
      </ul>

      <div className="text-xs text-muted-foreground">
        Saved as <code>pending_review</code>. Review &amp; publish from the queue.
      </div>
    </div>
  );
}

export function FetchManager() {
  const [query, setQuery] = useState("");
  const [scope, setScope] = useState<"course" | "institute" | "both">("course");
  const [override, setOverride] = useState(false);
  const [count, setCount] = useState(5);
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
        body: JSON.stringify({ query: query.trim(), scope, override, count }),
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
          />
        </label>

        <div className="flex flex-wrap gap-3">
          <label className="flex flex-col gap-1 text-xs">
            Scope
            <select
              value={scope}
              onChange={(e) => setScope(e.target.value as typeof scope)}
              className="rounded-md border border-input bg-background px-2 py-1.5 text-sm"
            >
              <option value="course">Course only</option>
              <option value="institute">Institute only</option>
              <option value="both">Both</option>
            </select>
          </label>

          <label className="flex flex-col gap-1 text-xs">
            Number of courses
            <input
              type="number"
              min={1}
              max={20}
              value={count}
              onChange={(e) => setCount(Math.max(1, Math.min(20, Number(e.target.value))))}
              className="w-20 rounded-md border border-input bg-background px-2 py-1.5 text-sm"
            />
          </label>

          <label className="flex items-center gap-2 self-end text-xs">
            <input
              type="checkbox"
              checked={override}
              onChange={(e) => setOverride(e.target.checked)}
            />
            Override exclusion list (allow duplicates)
          </label>
        </div>

        <button
          type="submit"
          disabled={loading || query.trim().length < 2}
          className="self-start rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
        >
          {loading
            ? count > 1
              ? `Fetching ${count} courses with AI…`
              : "Fetching with AI…"
            : count > 1
              ? `Fetch ${count} courses with AI`
              : "Fetch with AI"}
        </button>
      </form>

      {error ? (
        <div className="rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">
          {error}
        </div>
      ) : null}

      {/* Batch summary banner */}
      {isBatch && response ? (
        <div className="flex items-center gap-3 rounded-md border bg-muted/40 px-4 py-2 text-sm">
          <span className="font-semibold">
            {(response as BatchResponse).total} course
            {(response as BatchResponse).total !== 1 ? "s" : ""} fetched &amp; saved
          </span>
          {(response as BatchResponse).failures.length > 0 && (
            <span className="text-orange-700">
              · {(response as BatchResponse).failures.length} iteration
              {(response as BatchResponse).failures.length !== 1 ? "s" : ""} failed
            </span>
          )}
          <Link href="/admin/review" className="ml-auto text-xs underline">
            Open Review Queue →
          </Link>
        </div>
      ) : null}

      {/* Failure details for batch */}
      {isBatch && (response as BatchResponse).failures.length > 0 ? (
        <div className="rounded-md border border-orange-400/40 bg-orange-400/5 p-3 text-xs text-orange-700">
          <div className="mb-1 font-semibold">Failed iterations:</div>
          {(response as BatchResponse).failures.map((f, i) => (
            <div key={i}>⚠ {f}</div>
          ))}
        </div>
      ) : null}

      {/* Course cards */}
      {courses.map((item, idx) => (
        <CourseCard
          key={item.courseId}
          item={item}
          index={courses.length > 1 ? idx : undefined}
        />
      ))}
    </div>
  );
}
