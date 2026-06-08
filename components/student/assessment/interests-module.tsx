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
 * Interests module — a 1–5 Likert self-report. The student picks one option
 * id per item; scoring (RIASEC) runs server-side from the DB scoringMap.
 *
 * Presentation: one question card at a time via the shared LikertModule. The
 * option ids carry the 1..5 ordering server-side; we map them onto the labelled
 * scale by option index so the big scale targets stay meaningful.
 */
export function InterestsModule({
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
      title="Your interests"
      description="How much would you enjoy each activity? Go with your gut — there are no right answers."
      lowLabel="Not for me"
      highLabel="Love it"
    />
  );
}
