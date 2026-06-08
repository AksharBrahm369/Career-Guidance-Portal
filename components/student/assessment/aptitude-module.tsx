"use client";

import { useEffect, useRef, useState } from "react";
import { Timer } from "lucide-react";
import type { ChoiceAnswers, ClientItem } from "./types";
import { ModuleIntro, QuestionCard, QuestionPrompt, OptionButton, ImageOption } from "./wizard-ui";
import { StickyActions } from "./sticky-actions";

interface Props {
  items: ClientItem[];
  initial: ChoiceAnswers;
  onComplete: (answers: ChoiceAnswers) => void;
  onBack?: () => void;
  saving: boolean;
  step: number;
  total: number;
}

function fmt(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

/**
 * Aptitude module — a timed single-correct MCQ, one question at a time.
 * Correctness is graded server-side on submit (the client never sees the key).
 *
 * The ticking elapsed value lives in a ref (rerender-use-ref-transient-values);
 * a 1s interval drives the whole-second display state so the option grid does
 * not re-render on every tick. The timer is an elapsed display only — it does
 * not gate submission. Figural stems/options reserve fixed boxes to avoid CLS.
 */
export function AptitudeModule({ items, initial, onComplete, onBack, saving, step, total }: Props) {
  const [answers, setAnswers] = useState<ChoiceAnswers>(initial);
  const [q, setQ] = useState(() => {
    const firstUnanswered = items.findIndex((i) => !answers[i.id]);
    return firstUnanswered === -1 ? 0 : firstUnanswered;
  });
  const [display, setDisplay] = useState(0);
  const startedAt = useRef(Date.now());
  const elapsed = useRef(0);

  useEffect(() => {
    const t = setInterval(() => {
      elapsed.current = Math.floor((Date.now() - startedAt.current) / 1000);
      setDisplay(elapsed.current);
    }, 1000);
    return () => clearInterval(t);
  }, []);

  const item = items[q]!;
  const isLast = q === items.length - 1;
  const allAnswered = items.every((i) => answers[i.id]);
  const selected = answers[item.id];
  const hasImageOptions = !!item.media?.options;

  function choose(optId: string) {
    setAnswers((cur) => ({ ...cur, [item.id]: optId }));
  }

  function handleNext() {
    if (!selected) return;
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
      <div className="flex items-start justify-between gap-3">
        <ModuleIntro
          step={step}
          total={total}
          title="Quick aptitude check"
          description="Pick the best answer for each. Work steadily — there's no penalty for guessing."
        />
        <span
          aria-label={`Time elapsed ${fmt(display)}`}
          className="mt-1 inline-flex shrink-0 items-center gap-1.5 rounded-full bg-muted px-3 py-1.5 text-sm font-medium tabular-nums text-muted-foreground"
        >
          <Timer className="size-4" aria-hidden />
          {fmt(display)}
        </span>
      </div>

      <QuestionCard count={items.length} index={q}>
        <QuestionPrompt>{item.questionText}</QuestionPrompt>

        {item.media?.stem ? (
          <div className="flex min-h-40 items-center justify-center rounded-md bg-muted/40 p-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={item.media.stem} alt="" className="max-h-40 w-auto rounded" />
          </div>
        ) : null}

        {hasImageOptions ? (
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
            {item.options.map((opt) => (
              <ImageOption
                key={opt.id}
                selected={selected === opt.id}
                onSelect={() => choose(opt.id)}
                src={item.media!.options![opt.id]!}
                label={opt.text}
              />
            ))}
          </div>
        ) : (
          <div className="flex flex-col gap-2.5">
            {item.options.map((opt) => (
              <OptionButton
                key={opt.id}
                selected={selected === opt.id}
                onSelect={() => choose(opt.id)}
              >
                {opt.text}
              </OptionButton>
            ))}
          </div>
        )}
      </QuestionCard>

      <StickyActions
        onBack={q > 0 || onBack ? handleBack : undefined}
        onNext={handleNext}
        nextDisabled={!selected}
        saving={saving}
        finish={isLast && step === total}
        nextLabel={isLast ? (step === total ? "Finish" : "Continue") : "Next"}
      />
    </div>
  );
}
