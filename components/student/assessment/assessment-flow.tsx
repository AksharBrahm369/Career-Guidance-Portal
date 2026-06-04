"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { InterestsModule } from "./interests-module";
import { WorkStyleModule } from "./work-style-module";
import { AptitudeModule } from "./aptitude-module";
import { MarksModule } from "./marks-module";
import type { ChoiceAnswers, ClientItems, MarksAnswers } from "./types";

const MODULES = ["interests", "work_style", "aptitude", "marks"] as const;
type ModuleKey = (typeof MODULES)[number];
const STEP_LABELS: Record<ModuleKey, string> = {
  interests: "Interests",
  work_style: "Work style",
  aptitude: "Aptitude",
  marks: "Marks",
};

interface Props {
  attemptId: string | null;
  initialResponses: Record<string, unknown>;
  items: ClientItems;
}

/**
 * Client orchestrator for the 4-module flow (Interests → Work-style → Aptitude
 * → Marks). Each module's answers are PATCHed to the attempt before advancing,
 * so a refresh mid-flow resumes from the server-persisted responses. The final
 * module submits and refreshes the server component, which then renders the
 * captured profile for the now-completed attempt.
 */
export function AssessmentFlow({ attemptId: initialAttemptId, initialResponses, items }: Props) {
  const router = useRouter();
  const [attemptId, setAttemptId] = useState<string | null>(initialAttemptId);
  const [step, setStep] = useState(() => {
    const firstIncomplete = MODULES.findIndex((m) => initialResponses[m] == null);
    return firstIncomplete === -1 ? MODULES.length - 1 : firstIncomplete;
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [, startRefresh] = useTransition();

  const initial = useMemo(
    () => ({
      interests: (initialResponses.interests as ChoiceAnswers) ?? {},
      work_style: (initialResponses.work_style as ChoiceAnswers) ?? {},
      aptitude: (initialResponses.aptitude as ChoiceAnswers) ?? {},
      marks: (initialResponses.marks as Partial<MarksAnswers> | undefined) ?? undefined,
    }),
    [initialResponses],
  );

  async function start() {
    setError(null);
    setSaving(true);
    try {
      const res = await fetch("/api/assessment/start", { method: "POST" });
      if (!res.ok) throw new Error("start_failed");
      const { id } = (await res.json()) as { id: string };
      setAttemptId(id);
    } catch {
      setError("Couldn't start the assessment. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  async function saveModule(module: ModuleKey, answers: ChoiceAnswers | MarksAnswers) {
    if (!attemptId) return false;
    const res = await fetch(`/api/assessment/${attemptId}/responses`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ module, answers }),
    });
    return res.ok;
  }

  async function onModuleComplete(module: ModuleKey, answers: ChoiceAnswers | MarksAnswers) {
    setError(null);
    setSaving(true);
    try {
      const ok = await saveModule(module, answers);
      if (!ok) {
        setError("Couldn't save your answers. Please try again.");
        return;
      }
      if (module === "marks") {
        const res = await fetch(`/api/assessment/${attemptId}/submit`, { method: "POST" });
        if (!res.ok) {
          const d = (await res.json().catch(() => ({}))) as { error?: string };
          setError(
            d.error === "incomplete"
              ? "Some modules are still incomplete — please finish them first."
              : "Couldn't finish the assessment. Please try again.",
          );
          return;
        }
        // Server component re-reads the now-completed attempt → captured profile.
        startRefresh(() => router.refresh());
        return;
      }
      setStep((s) => Math.min(s + 1, MODULES.length - 1));
    } finally {
      setSaving(false);
    }
  }

  if (!attemptId) {
    return (
      <section className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <h1 className="text-xl font-semibold">Discover your Brain Profile</h1>
          <p className="text-sm text-muted-foreground">
            Four short modules — your interests, how you like to work, a quick aptitude check, and
            your recent marks. It takes about 15 minutes, and you can pause and resume anytime.
          </p>
        </div>
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        <button
          type="button"
          onClick={start}
          disabled={saving}
          className="self-start rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground disabled:opacity-50"
        >
          {saving ? "Starting…" : "Start assessment"}
        </button>
      </section>
    );
  }

  const current = MODULES[step]!; // step is always clamped to a valid index

  return (
    <section className="flex flex-col gap-5">
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>
            Step {step + 1} of {MODULES.length} · {STEP_LABELS[current]}
          </span>
          <span>{Math.round(((step + 1) / MODULES.length) * 100)}%</span>
        </div>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-primary transition-all"
            style={{ width: `${((step + 1) / MODULES.length) * 100}%` }}
          />
        </div>
      </div>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      {current === "interests" ? (
        <InterestsModule
          items={items.interests}
          initial={initial.interests}
          onComplete={(a) => onModuleComplete("interests", a)}
          saving={saving}
        />
      ) : current === "work_style" ? (
        <WorkStyleModule
          items={items.work_style}
          initial={initial.work_style}
          onComplete={(a) => onModuleComplete("work_style", a)}
          saving={saving}
        />
      ) : current === "aptitude" ? (
        <AptitudeModule
          items={items.aptitude}
          initial={initial.aptitude}
          onComplete={(a) => onModuleComplete("aptitude", a)}
          saving={saving}
        />
      ) : (
        <MarksModule
          initial={initial.marks}
          onComplete={(a) => onModuleComplete("marks", a)}
          saving={saving}
        />
      )}
    </section>
  );
}
