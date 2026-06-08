"use client";

import { useState } from "react";
import type { ChoiceAnswers, ClientItem } from "./types";
import { LikertModule } from "./likert-module";

interface Props {
  items: ClientItem[];
  initial: ChoiceAnswers;
  onComplete: (answers: ChoiceAnswers) => void;
  onBack?: () => void;
  saving: boolean;
  step: number;
  total: number;
}

/**
 * Work-style module — a 1–5 agreement Likert self-report. One option id per
 * item; trait scoring runs server-side from the DB scoringMap.
 *
 * Presentation: one statement card at a time on the shared LikertModule, with
 * agreement anchors.
 */
export function WorkStyleModule({
  items,
  initial,
  onComplete,
  onBack,
  saving,
  step,
  total,
}: Props) {
  const [answers, setAnswers] = useState<ChoiceAnswers>(initial);
  return (
    <LikertModule
      items={items}
      answers={answers}
      setAnswers={setAnswers}
      onComplete={onComplete}
      onBack={onBack}
      saving={saving}
      step={step}
      total={total}
      title="How you like to work"
      description="How well does each statement describe you? Pick the point that feels closest."
      lowLabel="Not like me"
      highLabel="Just like me"
    />
  );
}
