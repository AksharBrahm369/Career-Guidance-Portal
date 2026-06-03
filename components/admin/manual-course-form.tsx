"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

interface InstituteDraft {
  name: string;
  city: string;
  state: string;
  instituteType: "government" | "private" | "deemed" | "autonomous" | "international";
}

const EMPTY_INSTITUTE: InstituteDraft = {
  name: "",
  city: "",
  state: "",
  instituteType: "private",
};

export function ManualCourseForm() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    courseName: "",
    courseCode: "",
    stream: "science" as "science" | "commerce" | "arts" | "vocational",
    aiSafetyTag: "ai_augmented" as "ai_safe" | "ai_augmented" | "ai_risk",
    aiSafetyReasoning: "",
    description: "",
    tenureYears: "3",
    eligibilityCriteria: "",
    careerClusters: "",
    entranceExams: "",
    feesMinInr: "",
    feesMaxInr: "",
    sourceUrls: "",
    requiredSubjects: "",
    minAggregate: "",
  });
  const [institutes, setInstitutes] = useState<InstituteDraft[]>([{ ...EMPTY_INSTITUTE }]);

  function update<K extends keyof typeof form>(k: K, v: (typeof form)[K]) {
    setForm({ ...form, [k]: v });
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (form.description.length < 150) {
      setError("Description must be at least 150 characters.");
      return;
    }
    const validInstitutes = institutes.filter(
      (i) => i.name.trim() && i.city.trim() && i.state.trim(),
    );
    if (validInstitutes.length === 0) {
      setError("Add at least one institute.");
      return;
    }

    const payload = {
      courseName: form.courseName.trim(),
      courseCode: form.courseCode.trim() || undefined,
      stream: form.stream,
      aiSafetyTag: form.aiSafetyTag,
      aiSafetyReasoning: form.aiSafetyReasoning.trim() || "Manually entered.",
      description: form.description.trim(),
      tenureYears: Number(form.tenureYears),
      eligibilityCriteria: form.eligibilityCriteria.trim(),
      careerClusters: form.careerClusters
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
      entranceExams: form.entranceExams
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
      feesMinInr: form.feesMinInr ? Number(form.feesMinInr) : undefined,
      feesMaxInr: form.feesMaxInr ? Number(form.feesMaxInr) : undefined,
      sourceUrls: form.sourceUrls
        .split(/[\s,]+/)
        .map((s) => s.trim())
        .filter(Boolean),
      requiredSubjects: form.requiredSubjects
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
      ...(form.minAggregate !== ""
        ? { eligibility: { minAggregate: Number(form.minAggregate) } }
        : {}),
      institutes: validInstitutes,
    };

    setSubmitting(true);
    try {
      const res = await fetch("/api/admin/courses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.detail ?? data.error ?? `HTTP ${res.status}`);
        return;
      }
      router.push("/admin/review");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-4 sm:grid-cols-2">
      <Field label="Course name" required>
        <input
          required
          className={inputCls}
          value={form.courseName}
          onChange={(e) => update("courseName", e.target.value)}
        />
      </Field>
      <Field label="Code (optional)">
        <input
          className={inputCls}
          value={form.courseCode}
          onChange={(e) => update("courseCode", e.target.value)}
          placeholder="B.Sc., MBBS"
        />
      </Field>

      <Field label="Stream" required>
        <select
          className={inputCls}
          value={form.stream}
          onChange={(e) => update("stream", e.target.value as typeof form.stream)}
        >
          <option value="science">Science</option>
          <option value="commerce">Commerce</option>
          <option value="arts">Arts</option>
          <option value="vocational">Vocational</option>
        </select>
      </Field>
      <Field label="AI safety tag" required>
        <select
          className={inputCls}
          value={form.aiSafetyTag}
          onChange={(e) => update("aiSafetyTag", e.target.value as typeof form.aiSafetyTag)}
        >
          <option value="ai_safe">ai_safe</option>
          <option value="ai_augmented">ai_augmented</option>
          <option value="ai_risk">ai_risk</option>
        </select>
      </Field>

      <Field label="Tenure (years)" required>
        <input
          type="number"
          step="0.5"
          min="0.5"
          max="10"
          required
          className={inputCls}
          value={form.tenureYears}
          onChange={(e) => update("tenureYears", e.target.value)}
        />
      </Field>
      <Field label="Career clusters (comma-separated)" required>
        <input
          required
          className={inputCls}
          value={form.careerClusters}
          onChange={(e) => update("careerClusters", e.target.value)}
          placeholder="Healthcare, Life Sciences"
        />
      </Field>

      <Field label="Eligibility criteria" required full>
        <input
          required
          className={inputCls}
          value={form.eligibilityCriteria}
          onChange={(e) => update("eligibilityCriteria", e.target.value)}
          placeholder="12th with PCB, min 50%"
        />
      </Field>

      <Field label="Description (min 150 chars)" required full>
        <textarea
          required
          rows={6}
          className={inputCls}
          value={form.description}
          onChange={(e) => update("description", e.target.value)}
        />
        <div className="mt-1 text-xs text-muted-foreground">{form.description.length}/150</div>
      </Field>

      <Field label="AI safety reasoning (1-2 sentences)" full>
        <textarea
          rows={2}
          className={inputCls}
          value={form.aiSafetyReasoning}
          onChange={(e) => update("aiSafetyReasoning", e.target.value)}
          placeholder="Why this AI safety tag? Defaults to 'Manually entered.' if blank."
        />
      </Field>

      <Field label="Entrance exams (comma-separated)">
        <input
          className={inputCls}
          value={form.entranceExams}
          onChange={(e) => update("entranceExams", e.target.value)}
          placeholder="NEET, JEE Main"
        />
      </Field>
      <Field label="Source URLs (space/comma separated)">
        <input
          className={inputCls}
          value={form.sourceUrls}
          onChange={(e) => update("sourceUrls", e.target.value)}
        />
      </Field>

      <Field label="Min fees (INR/yr)">
        <input
          type="number"
          min="0"
          className={inputCls}
          value={form.feesMinInr}
          onChange={(e) => update("feesMinInr", e.target.value)}
        />
      </Field>
      <Field label="Max fees (INR/yr)">
        <input
          type="number"
          min="0"
          className={inputCls}
          value={form.feesMaxInr}
          onChange={(e) => update("feesMaxInr", e.target.value)}
        />
      </Field>

      <Field label="Required subjects (comma-separated)">
        <input
          className={inputCls}
          value={form.requiredSubjects}
          onChange={(e) => update("requiredSubjects", e.target.value)}
          placeholder="Physics, Chemistry, Mathematics"
        />
      </Field>
      <Field label="Minimum aggregate % (optional)">
        <input
          type="number"
          min="0"
          max="100"
          step="0.5"
          className={inputCls}
          value={form.minAggregate}
          onChange={(e) => update("minAggregate", e.target.value)}
          placeholder="e.g. 60"
        />
      </Field>

      <div className="sm:col-span-2">
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-sm font-semibold">Institutes</h3>
          <button
            type="button"
            onClick={() => setInstitutes([...institutes, { ...EMPTY_INSTITUTE }])}
            className="rounded-md border px-2 py-1 text-xs"
          >
            + Add institute
          </button>
        </div>
        <div className="flex flex-col gap-2">
          {institutes.map((inst, idx) => (
            <div
              key={idx}
              className="grid grid-cols-2 gap-2 rounded-md border p-2 sm:grid-cols-4"
            >
              <input
                className={inputCls}
                placeholder="Name"
                value={inst.name}
                onChange={(e) => {
                  const next = [...institutes];
                  next[idx] = { ...inst, name: e.target.value };
                  setInstitutes(next);
                }}
              />
              <input
                className={inputCls}
                placeholder="City"
                value={inst.city}
                onChange={(e) => {
                  const next = [...institutes];
                  next[idx] = { ...inst, city: e.target.value };
                  setInstitutes(next);
                }}
              />
              <input
                className={inputCls}
                placeholder="State"
                value={inst.state}
                onChange={(e) => {
                  const next = [...institutes];
                  next[idx] = { ...inst, state: e.target.value };
                  setInstitutes(next);
                }}
              />
              <select
                className={inputCls}
                value={inst.instituteType}
                onChange={(e) => {
                  const next = [...institutes];
                  next[idx] = {
                    ...inst,
                    instituteType: e.target.value as InstituteDraft["instituteType"],
                  };
                  setInstitutes(next);
                }}
              >
                <option value="government">Government</option>
                <option value="private">Private</option>
                <option value="deemed">Deemed</option>
                <option value="autonomous">Autonomous</option>
                <option value="international">International</option>
              </select>
            </div>
          ))}
        </div>
      </div>

      {error ? (
        <div className="sm:col-span-2 rounded-md border border-destructive/40 bg-destructive/5 p-2 text-sm text-destructive">
          {error}
        </div>
      ) : null}

      <div className="sm:col-span-2 flex gap-2">
        <button
          type="submit"
          disabled={submitting}
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
        >
          {submitting ? "Saving…" : "Save to Review Queue"}
        </button>
      </div>
    </form>
  );
}

const inputCls =
  "w-full rounded-md border border-input bg-background px-2 py-1.5 text-sm";

function Field({
  label,
  children,
  required,
  full,
}: {
  label: string;
  children: React.ReactNode;
  required?: boolean;
  full?: boolean;
}) {
  return (
    <label className={`flex flex-col gap-1 ${full ? "sm:col-span-2" : ""}`}>
      <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
        {required ? " *" : ""}
      </span>
      {children}
    </label>
  );
}
