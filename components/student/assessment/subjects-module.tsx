"use client";

import { useState } from "react";
import { Check } from "lucide-react";
import { SUBJECTS } from "@/lib/assessment/subjects";
import { cn } from "@/lib/utils";
import type { SubjectAnswers } from "./types";
import { ModuleIntro } from "./wizard-ui";
import { StickyActions } from "./sticky-actions";

interface Props {
  initial: SubjectAnswers;
  onComplete: (answers: SubjectAnswers) => void;
  onBack?: () => void;
  saving: boolean;
  step: number;
  total: number;
}

const SCALE: { v: number; label: string }[] = [
  { v: 1, label: "Strongly dislike" },
  { v: 2, label: "Dislike" },
  { v: 3, label: "Neutral" },
  { v: 4, label: "Like" },
  { v: 5, label: "Strongly like" },
];

/**
 * Subject-preference grid — the student rates how much they LIKE each standard
 * 11–12 subject (1–5). Distinct from marks (performance): this captures interest
 * at the subject level, which the engine matches to a course's required subjects.
 *
 * Presentation: tight one-module sectioning — each subject is its own row with a
 * large 1–5 target strip (selected = coloured ring + check). A small counter
 * shows how many of the set are rated so progress is always legible.
 */
export function SubjectsModule({ initial, onComplete, onBack, saving, step, total }: Props) {
  const [answers, setAnswers] = useState<SubjectAnswers>(initial);
  const ratedCount = SUBJECTS.filter((s) => answers[s] != null).length;
  const allAnswered = ratedCount === SUBJECTS.length;

  return (
    <div className="flex flex-col gap-6">
      <ModuleIntro
        step={step}
        total={total}
        title="Subjects you enjoy"
        description="Rate each subject by how much you enjoy it — not how well you score. There are no right answers."
      />

      <div className="flex items-center justify-between rounded-lg border bg-muted/40 px-4 py-2.5">
        <span className="text-sm text-muted-foreground">Rated so far</span>
        <span className="text-sm font-semibold tabular-nums">
          {ratedCount}
          <span className="text-muted-foreground"> / {SUBJECTS.length}</span>
        </span>
      </div>

      <fieldset className="flex flex-col gap-3">
        {SUBJECTS.map((subject) => {
          const current = answers[subject];
          return (
            <div
              key={subject}
              className="flex flex-col gap-2.5 rounded-lg border bg-card p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:gap-4"
            >
              <p className="text-base font-medium leading-snug">{subject}</p>
              <div
                className="grid shrink-0 grid-cols-5 gap-1.5 sm:w-[16rem]"
                role="radiogroup"
                aria-label={`How much you like ${subject}`}
              >
                {SCALE.map((opt) => {
                  const selected = current === opt.v;
                  return (
                    <button
                      key={opt.v}
                      type="button"
                      role="radio"
                      aria-checked={selected}
                      aria-label={`${subject}: ${opt.label}`}
                      title={opt.label}
                      onClick={() => setAnswers((cur) => ({ ...cur, [subject]: opt.v }))}
                      className={cn(
                        "flex h-11 items-center justify-center rounded-md border bg-background text-sm font-semibold tabular-nums transition-colors duration-150",
                        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                        "motion-reduce:transition-none",
                        selected
                          ? "border-accent bg-accent text-accent-foreground ring-2 ring-accent"
                          : "text-muted-foreground hover:border-primary/50",
                      )}
                    >
                      {selected ? <Check className="size-4" aria-hidden /> : opt.v}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </fieldset>

      <StickyActions
        onBack={onBack}
        onNext={() => allAnswered && onComplete(answers)}
        nextDisabled={!allAnswered}
        saving={saving}
        finish={step === total}
        nextLabel={step === total ? "Finish" : "Continue"}
      />
    </div>
  );
}
