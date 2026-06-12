"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { ArrowRight, Clock, Loader2, RotateCcw, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { InterestsModule } from "./interests-module";
import { WorkStyleModule } from "./work-style-module";
import { AptitudeModule } from "./aptitude-module";
import { SubjectsModule } from "./subjects-module";
import { MarksModule } from "./marks-module";
import { SaveIndicator } from "./wizard-ui";
import type { ChoiceAnswers, ClientItems, MarksAnswers, SubjectAnswers } from "./types";

const MODULES = ["interests", "work_style", "aptitude", "subjects", "marks"] as const;
const QUESTION_MODULES = ["interests", "work_style", "aptitude"] as const;
type ModuleKey = (typeof MODULES)[number];
type QuestionModuleKey = (typeof QUESTION_MODULES)[number];
const STEP_LABELS: Record<ModuleKey, string> = {
  interests: "Interests",
  work_style: "Work style",
  aptitude: "Aptitude",
  subjects: "Subjects",
  marks: "Marks",
};

type SaveState = "idle" | "saving" | "saved" | "error";

interface Props {
  attemptId: string | null;
  initialResponses: Record<string, unknown>;
  items: ClientItems;
}

/**
 * Client orchestrator for the 5-module flow (Interests → Work-style → Aptitude
 * → Subjects → Marks). Each module's answers are PATCHed to the attempt before
 * advancing, so a refresh mid-flow resumes from the server-persisted responses.
 * The final module submits and refreshes the server component, which then renders
 * the captured profile for the now-completed attempt.
 *
 * Presentation: a calm guided wizard — a persistent top progress bar (module x/5
 * + autosave indicator), one module on screen at a time (each module steps
 * through its own questions), and a sticky bottom action bar owned by the module.
 */
export function AssessmentFlow({ attemptId: initialAttemptId, initialResponses, items }: Props) {
  const router = useRouter();
  const [attemptId, setAttemptId] = useState<string | null>(initialAttemptId);
  const [step, setStep] = useState(() => {
    const firstIncomplete = MODULES.findIndex((m) => initialResponses[m] == null);
    return firstIncomplete === -1 ? MODULES.length - 1 : firstIncomplete;
  });
  const [saving, setSaving] = useState(false);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [error, setError] = useState<string | null>(null);
  const [, startRefresh] = useTransition();
  const missingQuestionModules = QUESTION_MODULES.filter((m) => items[m].length === 0);
  const missingQuestionModuleLabels = missingQuestionModules.map((m) => STEP_LABELS[m]).join(", ");

  // Children only read these to seed their initial useState, so a stable
  // identity buys nothing — derive during render instead of memoizing.
  const initial = {
    interests: (initialResponses.interests as ChoiceAnswers) ?? {},
    work_style: (initialResponses.work_style as ChoiceAnswers) ?? {},
    aptitude: (initialResponses.aptitude as ChoiceAnswers) ?? {},
    subjects: (initialResponses.subjects as SubjectAnswers) ?? {},
    marks: (initialResponses.marks as Partial<MarksAnswers> | undefined) ?? undefined,
  };

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

  async function saveModule(
    module: ModuleKey,
    answers: ChoiceAnswers | SubjectAnswers | MarksAnswers,
  ) {
    if (!attemptId) return false;
    const res = await fetch(`/api/assessment/${attemptId}/responses`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ module, answers }),
    });
    return res.ok;
  }

  function goBack() {
    setError(null);
    setStep((s) => Math.max(s - 1, 0));
  }

  async function onModuleComplete(
    module: ModuleKey,
    answers: ChoiceAnswers | SubjectAnswers | MarksAnswers,
  ) {
    setError(null);
    setSaving(true);
    setSaveState("saving");
    try {
      const ok = await saveModule(module, answers);
      if (!ok) {
        setSaveState("error");
        setError("Couldn't save your answers. Please try again.");
        return;
      }
      setSaveState("saved");
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
      <section className="mx-auto flex max-w-2xl flex-col gap-6">
        <div className="flex flex-col items-center gap-4 rounded-2xl border bg-card p-6 text-center shadow-sm sm:p-10">
          <span className="flex size-14 items-center justify-center rounded-2xl bg-accent/15 text-accent">
            <Sparkles className="size-7" aria-hidden />
          </span>
          <div className="flex flex-col gap-2">
            <h1 className="font-heading text-3xl font-bold leading-tight">
              Let&apos;s discover your Brain Profile
            </h1>
            <p className="mx-auto max-w-prose text-base leading-relaxed text-muted-foreground">
              Five short modules — your interests, how you like to work, a quick aptitude check, the
              subjects you enjoy, and your recent marks. We&apos;ll turn your answers into careers
              that fit you.
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-sm text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <Clock className="size-4 text-accent" aria-hidden />
              About 15–20 minutes
            </span>
            <span className="inline-flex items-center gap-1.5">
              <RotateCcw className="size-4 text-accent" aria-hidden />
              Pause &amp; resume anytime
            </span>
          </div>
          {error ? (
            <Alert variant="destructive" className="text-left">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : null}
          {missingQuestionModules.length > 0 ? (
            <Alert className="text-left">
              <AlertDescription>
                Assessment questions are not available yet. Missing active question-bank rows for:{" "}
                {missingQuestionModuleLabels}.
              </AlertDescription>
            </Alert>
          ) : null}
          <Button
            type="button"
            size="lg"
            onClick={start}
            disabled={saving || missingQuestionModules.length > 0}
            className="w-full sm:w-auto"
          >
            {saving ? (
              <>
                <Loader2 className="animate-spin motion-reduce:animate-none" aria-hidden />
                Starting…
              </>
            ) : (
              <>
                Start assessment
                <ArrowRight aria-hidden />
              </>
            )}
          </Button>
        </div>
        <p className="text-center text-xs text-muted-foreground">
          Your answers are private and used only to build your profile.
        </p>
      </section>
    );
  }

  const current = MODULES[step]!; // step is always clamped to a valid index
  const onBack = step > 0 ? goBack : undefined;
  const moduleStep = step + 1;
  const moduleTotal = MODULES.length;
  const pct = (moduleStep / moduleTotal) * 100;
  const currentQuestionModule = QUESTION_MODULES.includes(current as QuestionModuleKey)
    ? (current as QuestionModuleKey)
    : null;
  const currentQuestionItemsMissing =
    currentQuestionModule != null && items[currentQuestionModule].length === 0;
  const currentQuestionModuleLabel = currentQuestionModule
    ? STEP_LABELS[currentQuestionModule]
    : "";

  return (
    <section className="flex flex-col gap-6">
      {/* Persistent progress header */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between gap-3">
          <span className="text-sm font-medium">
            <span className="text-foreground">Module {moduleStep}</span>
            <span className="text-muted-foreground"> of {moduleTotal}</span>
            <span className="text-muted-foreground"> · {STEP_LABELS[current]}</span>
          </span>
          <SaveIndicator state={saveState} />
        </div>
        <Progress
          value={pct}
          aria-label={`Module ${moduleStep} of ${moduleTotal}`}
          className="h-2"
        />
      </div>

      {error ? (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      {currentQuestionItemsMissing ? (
        <Alert>
          <AlertDescription>
            Assessment questions are not available for {currentQuestionModuleLabel}. Please add or
            activate question-bank rows before continuing.
          </AlertDescription>
        </Alert>
      ) : null}

      {currentQuestionItemsMissing ? null : current === "interests" ? (
        <InterestsModule
          items={items.interests}
          initial={initial.interests}
          onComplete={(a) => onModuleComplete("interests", a)}
          onBack={onBack}
          saving={saving}
          step={moduleStep}
          total={moduleTotal}
        />
      ) : current === "work_style" ? (
        <WorkStyleModule
          items={items.work_style}
          initial={initial.work_style}
          onComplete={(a) => onModuleComplete("work_style", a)}
          onBack={onBack}
          saving={saving}
          step={moduleStep}
          total={moduleTotal}
        />
      ) : current === "aptitude" ? (
        <AptitudeModule
          items={items.aptitude}
          initial={initial.aptitude}
          onComplete={(a) => onModuleComplete("aptitude", a)}
          onBack={onBack}
          saving={saving}
          step={moduleStep}
          total={moduleTotal}
        />
      ) : current === "subjects" ? (
        <SubjectsModule
          initial={initial.subjects}
          onComplete={(a) => onModuleComplete("subjects", a)}
          onBack={onBack}
          saving={saving}
          step={moduleStep}
          total={moduleTotal}
        />
      ) : (
        <MarksModule
          initial={initial.marks}
          onComplete={(a) => onModuleComplete("marks", a)}
          onBack={onBack}
          saving={saving}
          step={moduleStep}
          total={moduleTotal}
        />
      )}
    </section>
  );
}
