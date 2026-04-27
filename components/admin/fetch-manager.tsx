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

export function FetchManager() {
  const [query, setQuery] = useState("");
  const [scope, setScope] = useState<"course" | "institute" | "both">("course");
  const [override, setOverride] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<FetchedCourse | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!query.trim() || loading) return;
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch("/api/admin/fetch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: query.trim(), scope, override }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.message ?? data.error ?? `HTTP ${res.status}`);
        return;
      }
      setResult(data as FetchedCourse);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <form onSubmit={onSubmit} className="flex flex-col gap-3 rounded-lg border bg-card p-4">
        <label className="flex flex-col gap-1 text-sm font-medium">
          Query
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder='e.g. "Marine Biology" or "All Healthcare courses"'
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
          {loading ? "Fetching with AI…" : "Fetch with AI"}
        </button>
      </form>

      {error ? (
        <div className="rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">
          {error}
        </div>
      ) : null}

      {result ? (
        <div className="flex flex-col gap-3 rounded-lg border bg-card p-4">
          <div className="flex items-start justify-between gap-2">
            <div>
              <div className="text-xs text-muted-foreground">via {result.provider}</div>
              <h2 className="text-xl font-semibold">{result.course.courseName}</h2>
              <div className="mt-1 flex flex-wrap gap-1.5 text-xs">
                <span className="rounded bg-muted px-2 py-0.5">{result.course.stream}</span>
                <span className="rounded bg-muted px-2 py-0.5">{result.course.aiSafetyTag}</span>
                <span className="rounded bg-muted px-2 py-0.5">{result.course.tenureYears} yrs</span>
              </div>
            </div>
            <Link
              href="/admin/review"
              className="rounded-md bg-primary px-3 py-1.5 text-xs text-primary-foreground"
            >
              Open in Review Queue
            </Link>
          </div>

          {result.warnings.length > 0 ? (
            <div className="rounded border border-orange-400/40 bg-orange-400/5 p-2 text-xs text-orange-700">
              {result.warnings.map((w, i) => (
                <div key={i}>⚠ {w}</div>
              ))}
            </div>
          ) : null}

          <p className="text-sm">{result.course.description}</p>

          <div className="text-xs text-muted-foreground">Career clusters</div>
          <div className="flex flex-wrap gap-1.5">
            {result.course.careerClusters.map((c) => (
              <span key={c} className="rounded bg-secondary px-2 py-0.5 text-xs">
                {c}
              </span>
            ))}
          </div>

          <div className="text-xs text-muted-foreground">{result.course.institutes.length} institutes</div>
          <ul className="space-y-1 text-sm">
            {result.course.institutes.slice(0, 5).map((i) => (
              <li key={`${i.name}-${i.city}`}>
                {i.name} — {i.city}, {i.state}
              </li>
            ))}
            {result.course.institutes.length > 5 ? (
              <li className="text-xs text-muted-foreground">
                +{result.course.institutes.length - 5} more
              </li>
            ) : null}
          </ul>

          <div className="text-xs text-muted-foreground">
            Saved as <code>pending_review</code>. Review &amp; publish from the queue.
          </div>
        </div>
      ) : null}
    </div>
  );
}
