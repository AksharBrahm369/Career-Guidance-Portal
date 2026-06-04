"use client";

import { useEffect, useRef, useState } from "react";
import type { ChoiceAnswers, ClientItem } from "./types";

interface Props {
  items: ClientItem[];
  initial: ChoiceAnswers;
  onComplete: (answers: ChoiceAnswers) => void;
  saving: boolean;
}

function fmt(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

/**
 * Aptitude module — a timed single-correct MCQ. One option id per item.
 * Correctness is graded server-side on submit (the client never sees the key).
 *
 * The ticking elapsed value lives in a ref (rerender-use-ref-transient-values);
 * a 1s interval drives the whole-second display state so the form below does not
 * re-render on every tick. The timer is an elapsed display only — it does not
 * gate submission in this plan.
 */
export function AptitudeModule({ items, initial, onComplete, saving }: Props) {
  const [answers, setAnswers] = useState<ChoiceAnswers>(initial);
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

  const allAnswered = items.every((i) => answers[i.id]);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (allAnswered) onComplete(answers);
      }}
      className="flex flex-col gap-4"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h2 className="text-lg font-semibold">Aptitude check</h2>
          <p className="text-sm text-muted-foreground">
            Pick the best answer for each. Work steadily — there&apos;s no penalty for guessing.
          </p>
        </div>
        <span
          aria-label="Time elapsed"
          className="shrink-0 rounded-md bg-muted px-2 py-1 font-mono text-xs tabular-nums text-muted-foreground"
        >
          {fmt(display)}
        </span>
      </div>

      <fieldset className="flex flex-col gap-4">
        {items.map((item, idx) => (
          <div key={item.id} className="flex flex-col gap-2 rounded-lg border bg-card p-4">
            <p className="text-sm font-medium">
              <span className="text-muted-foreground">{idx + 1}.</span> {item.questionText}
            </p>
            {item.media?.stem ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={item.media.stem} alt="" className="max-h-40 w-auto rounded" />
            ) : null}
            <div className="flex flex-col gap-1.5">
              {item.options.map((opt) => {
                const selected = answers[item.id] === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => setAnswers((cur) => ({ ...cur, [item.id]: opt.id }))}
                    className={`rounded-md border px-3 py-2 text-left text-sm transition ${
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
