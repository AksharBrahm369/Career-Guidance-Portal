"use client";

import { useState } from "react";
import type { ChoiceAnswers, ClientItem } from "./types";

interface Props {
  items: ClientItem[];
  initial: ChoiceAnswers;
  onComplete: (answers: ChoiceAnswers) => void;
  saving: boolean;
}

/**
 * Interests module — a 1–5 Likert self-report. The student picks one option
 * id per item; scoring (RIASEC) runs server-side from the DB scoringMap.
 */
export function InterestsModule({ items, initial, onComplete, saving }: Props) {
  const [answers, setAnswers] = useState<ChoiceAnswers>(initial);
  const allAnswered = items.every((i) => answers[i.id]);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (allAnswered) onComplete(answers);
      }}
      className="flex flex-col gap-4"
    >
      <div className="flex flex-col gap-1">
        <h2 className="text-lg font-semibold">Your interests</h2>
        <p className="text-sm text-muted-foreground">
          How much would you enjoy each activity? There are no right answers.
        </p>
      </div>

      <fieldset className="flex flex-col gap-4">
        {items.map((item, idx) => (
          <div key={item.id} className="flex flex-col gap-2 rounded-lg border bg-card p-4">
            <p className="text-sm font-medium">
              <span className="text-muted-foreground">{idx + 1}.</span> {item.questionText}
            </p>
            <div className="flex flex-wrap gap-1.5">
              {item.options.map((opt) => {
                const selected = answers[item.id] === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => setAnswers((cur) => ({ ...cur, [item.id]: opt.id }))}
                    className={`rounded-md border px-2.5 py-1.5 text-xs transition ${
                      selected
                        ? "border-primary bg-primary text-primary-foreground"
                        : "bg-background hover:border-primary"
                    }`}
                  >
                    {opt.text}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </fieldset>

      <button
        type="submit"
        disabled={!allAnswered || saving}
        className="rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground disabled:opacity-50"
      >
        {saving ? "Saving…" : "Continue"}
      </button>
    </form>
  );
}
