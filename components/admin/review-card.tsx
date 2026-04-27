"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

interface CourseRow {
  id: string;
  slug: string;
  courseName: string;
  stream: string;
  aiSafetyTag: string;
  aiSafetyReasoning: string | null;
  description: string;
  tenureYears: string;
  eligibilityCriteria: string;
  careerClusters: string[];
  entranceExams: string[];
  feesMinInr: string | null;
  feesMaxInr: string | null;
  source: string;
  createdAt: string | Date;
}

export function ReviewCard({ course }: { course: CourseRow }) {
  const router = useRouter();
  const [expanded, setExpanded] = useState(false);
  const [editing, setEditing] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState({
    courseName: course.courseName,
    description: course.description,
    aiSafetyTag: course.aiSafetyTag,
    aiSafetyReasoning: course.aiSafetyReasoning ?? "",
    careerClusters: course.careerClusters.join(", "),
    eligibilityCriteria: course.eligibilityCriteria,
    entranceExams: course.entranceExams.join(", "),
  });

  function refresh() {
    router.refresh();
  }

  async function save() {
    setError(null);
    const body = {
      courseName: draft.courseName,
      description: draft.description,
      aiSafetyTag: draft.aiSafetyTag,
      aiSafetyReasoning: draft.aiSafetyReasoning.trim() || null,
      careerClusters: draft.careerClusters
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
      eligibilityCriteria: draft.eligibilityCriteria,
      entranceExams: draft.entranceExams
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
    };
    const res = await fetch(`/api/admin/courses/${course.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.detail ?? data.error ?? `HTTP ${res.status}`);
      return false;
    }
    setEditing(false);
    return true;
  }

  async function publish() {
    setError(null);
    if (editing) {
      const ok = await save();
      if (!ok) return;
    }
    const res = await fetch(`/api/admin/courses/${course.id}/publish`, { method: "POST" });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      const detail = data.missing ? `missing: ${data.missing.join(", ")}` : data.error;
      setError(detail ?? `HTTP ${res.status}`);
      return;
    }
    startTransition(refresh);
  }

  async function reject() {
    setError(null);
    const reason = window.prompt("Rejection reason (required):");
    if (!reason || reason.trim().length < 3) return;
    const res = await fetch(`/api/admin/courses/${course.id}/reject`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason: reason.trim() }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? `HTTP ${res.status}`);
      return;
    }
    startTransition(refresh);
  }

  return (
    <div className="rounded-lg border bg-card p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="text-lg font-semibold">{course.courseName}</h2>
          <div className="mt-1 flex flex-wrap gap-1.5 text-xs">
            <Tag>{course.stream}</Tag>
            <Tag>{course.aiSafetyTag}</Tag>
            <Tag>{course.source}</Tag>
            <Tag>{course.tenureYears} yrs</Tag>
            {course.careerClusters.slice(0, 3).map((c) => (
              <Tag key={c}>{c}</Tag>
            ))}
          </div>
        </div>
        <div className="flex flex-wrap gap-1.5 text-xs">
          <button
            onClick={() => setExpanded((v) => !v)}
            className="rounded-md border px-2.5 py-1"
            disabled={pending}
          >
            {expanded ? "Collapse" : "Expand"}
          </button>
          <button
            onClick={() => setEditing((v) => !v)}
            className="rounded-md border px-2.5 py-1"
            disabled={pending}
          >
            {editing ? "Cancel edit" : "Edit"}
          </button>
          <button
            onClick={reject}
            className="rounded-md border border-destructive/40 px-2.5 py-1 text-destructive"
            disabled={pending}
          >
            Reject
          </button>
          <button
            onClick={publish}
            className="rounded-md bg-primary px-3 py-1 text-primary-foreground"
            disabled={pending}
          >
            {pending ? "…" : editing ? "Save & Publish" : "Publish"}
          </button>
        </div>
      </div>

      {error ? (
        <div className="mt-2 rounded border border-destructive/40 bg-destructive/5 p-2 text-xs text-destructive">
          {error}
        </div>
      ) : null}

      {expanded || editing ? (
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {editing ? (
            <>
              <Field label="Course name">
                <input
                  className="w-full rounded-md border bg-background px-2 py-1 text-sm"
                  value={draft.courseName}
                  onChange={(e) => setDraft({ ...draft, courseName: e.target.value })}
                />
              </Field>
              <Field label="AI safety tag">
                <select
                  className="w-full rounded-md border bg-background px-2 py-1 text-sm"
                  value={draft.aiSafetyTag}
                  onChange={(e) => setDraft({ ...draft, aiSafetyTag: e.target.value })}
                >
                  <option value="ai_safe">ai_safe</option>
                  <option value="ai_augmented">ai_augmented</option>
                  <option value="ai_risk">ai_risk</option>
                </select>
              </Field>
              <Field label="AI safety reasoning" full>
                <textarea
                  rows={3}
                  className="w-full rounded-md border bg-background px-2 py-1 text-sm"
                  value={draft.aiSafetyReasoning}
                  onChange={(e) => setDraft({ ...draft, aiSafetyReasoning: e.target.value })}
                />
              </Field>
              <Field label="Career clusters (comma-separated)" full>
                <input
                  className="w-full rounded-md border bg-background px-2 py-1 text-sm"
                  value={draft.careerClusters}
                  onChange={(e) => setDraft({ ...draft, careerClusters: e.target.value })}
                />
              </Field>
              <Field label="Eligibility" full>
                <input
                  className="w-full rounded-md border bg-background px-2 py-1 text-sm"
                  value={draft.eligibilityCriteria}
                  onChange={(e) => setDraft({ ...draft, eligibilityCriteria: e.target.value })}
                />
              </Field>
              <Field label="Entrance exams (comma-separated)" full>
                <input
                  className="w-full rounded-md border bg-background px-2 py-1 text-sm"
                  value={draft.entranceExams}
                  onChange={(e) => setDraft({ ...draft, entranceExams: e.target.value })}
                />
              </Field>
              <Field label="Description (min 150 chars)" full>
                <textarea
                  rows={6}
                  className="w-full rounded-md border bg-background px-2 py-1 text-sm"
                  value={draft.description}
                  onChange={(e) => setDraft({ ...draft, description: e.target.value })}
                />
              </Field>
              <div className="sm:col-span-2">
                <button
                  onClick={save}
                  className="rounded-md bg-secondary px-3 py-1 text-xs"
                  disabled={pending}
                >
                  Save edits (without publishing)
                </button>
              </div>
            </>
          ) : (
            <>
              {course.aiSafetyReasoning ? (
                <Field label="AI safety reasoning" full>
                  <p className="whitespace-pre-line text-sm">{course.aiSafetyReasoning}</p>
                </Field>
              ) : null}
              <Field label="Eligibility" full>
                <p className="text-sm">{course.eligibilityCriteria}</p>
              </Field>
              <Field label="Entrance exams" full>
                <p className="text-sm">
                  {course.entranceExams.length ? course.entranceExams.join(", ") : "—"}
                </p>
              </Field>
              <Field label="Description" full>
                <p className="whitespace-pre-line text-sm">{course.description}</p>
              </Field>
            </>
          )}
        </div>
      ) : null}
    </div>
  );
}

function Tag({ children }: { children: React.ReactNode }) {
  return <span className="rounded bg-muted px-2 py-0.5">{children}</span>;
}

function Field({
  label,
  children,
  full,
}: {
  label: string;
  children: React.ReactNode;
  full?: boolean;
}) {
  return (
    <div className={full ? "sm:col-span-2" : ""}>
      <div className="mb-1 text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
      {children}
    </div>
  );
}
