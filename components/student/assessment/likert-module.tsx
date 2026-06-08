"use client";

import { useState, type Dispatch, type SetStateAction } from "react";
import type { ChoiceAnswers, ClientItem } from "./types";
import { ModuleIntro, QuestionCard, QuestionPrompt, LikertScale } from "./wizard-ui";
import { StickyActions } from "./sticky-actions";

interface Props {
  items: ClientItem[];
  answers: ChoiceAnswers;
  setAnswers: Dispatch<SetStateAction<ChoiceAnswers>>;
  onComplete: (answers: ChoiceAnswers) => void;
  onBack?: () => void;
  saving: boolean;
  step: number;
  total: number;
  title: string;
  description: string;
  lowLabel: string;
  highLabel: string;
}

/**
 * Shared one-question-at-a-time Likert engine for interests & work-style.
 * Each item exposes ordered options whose ids encode the 1..5 scale server-side;
 * we present them as a single labelled 1–5 scale (mapping the chosen point back
 * to its option id) and step forward question by question. Module-level Back/Next
 * lives in the orchestrator's flow; within the module, Next advances one question
 * until the last, where it calls onComplete with the full answer map.
 */
export function LikertModule({
  items,
  answers,
  setAnswers,
  onComplete,
  onBack,
  saving,
  step,
  total,
  title,
  description,
  lowLabel,
  highLabel,
}: Props) {
  const [q, setQ] = useState(() => {
    const firstUnanswered = items.findIndex((i) => !answers[i.id]);
    return firstUnanswered === -1 ? 0 : firstUnanswered;
  });

  const item = items[q]!;
  const optionLabels = item.options.map((o) => o.text);
  const selectedOptionId = answers[item.id];
  const selectedValue = selectedOptionId
    ? item.options.findIndex((o) => o.id === selectedOptionId) + 1
    : undefined;

  const isLast = q === items.length - 1;
  const allAnswered = items.every((i) => answers[i.id]);

  function choose(value: number) {
    const opt = item.options[value - 1];
    if (!opt) return;
    setAnswers((cur) => ({ ...cur, [item.id]: opt.id }));
  }

  function handleNext() {
    if (!selectedValue) return;
    if (isLast) {
      if (allAnswered) onComplete(answers);
      return;
    }
    setQ((n) => Math.min(n + 1, items.length - 1));
  }

  function handleBack() {
    if (q === 0) {
      onBack?.();
      return;
    }
    setQ((n) => Math.max(n - 1, 0));
  }

  return (
    <div className="flex flex-col gap-6">
      <ModuleIntro step={step} total={total} title={title} description={description} />

      <QuestionCard count={items.length} index={q}>
        <QuestionPrompt>{item.questionText}</QuestionPrompt>
        <LikertScale
          value={selectedValue}
          onChange={choose}
          labels={optionLabels}
          lowLabel={optionLabels[0] ?? lowLabel}
          highLabel={optionLabels[optionLabels.length - 1] ?? highLabel}
          name={item.questionText}
        />
      </QuestionCard>

      <StickyActions
        onBack={q > 0 || onBack ? handleBack : undefined}
        onNext={handleNext}
        nextDisabled={!selectedValue}
        saving={saving}
        finish={isLast && step === total}
        nextLabel={isLast ? (step === total ? "Finish" : "Continue") : "Next"}
      />
    </div>
  );
}
