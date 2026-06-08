"use client";

import { Check, Cloud, CloudOff, Loader2 } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Shared presentational kit for the assessment wizard. Pure UI — no data flow.
 * Modules compose these so the look (big tappable options, Likert scale, sticky
 * action bar, intros) stays consistent without each module re-styling raw markup.
 */

/** Encouraging per-module intro: friendly heading + supportive one-liner. */
export function ModuleIntro({
  step,
  total,
  title,
  description,
}: {
  step: number;
  total: number;
  title: string;
  description: string;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-xs font-semibold uppercase tracking-wide text-accent">
        Module {step} of {total}
      </span>
      <h2 className="font-heading text-2xl font-semibold leading-tight text-foreground">{title}</h2>
      <p className="max-w-prose text-sm leading-relaxed text-muted-foreground">{description}</p>
    </div>
  );
}

/** A single elevated card holding one question (or a tight section). */
export function QuestionCard({
  count,
  index,
  children,
}: {
  /** total in the set, for the "Question x of y" chip (optional) */
  count?: number;
  /** 0-based position (optional) */
  index?: number;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4 rounded-lg border bg-card p-5 shadow-sm sm:p-6">
      {count != null && index != null ? (
        <span className="text-xs font-medium tabular-nums text-muted-foreground">
          Question {index + 1} of {count}
        </span>
      ) : null}
      {children}
    </div>
  );
}

/** The question prompt — generous, readable, friendly. */
export function QuestionPrompt({ children }: { children: ReactNode }) {
  return (
    <p className="text-balance text-lg font-medium leading-snug text-foreground">{children}</p>
  );
}

/**
 * A big tappable option button (≥44px). Selected = primary ring + check icon.
 * Used for single-select choices (interests, work-style, aptitude text options).
 */
export function OptionButton({
  selected,
  onSelect,
  children,
  ariaLabel,
}: {
  selected: boolean;
  onSelect: () => void;
  children: ReactNode;
  ariaLabel?: string;
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      aria-label={ariaLabel}
      onClick={onSelect}
      className={cn(
        "group flex min-h-[3rem] w-full items-center gap-3 rounded-lg border bg-background p-3.5 text-left text-base leading-snug transition-colors duration-150",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        "motion-reduce:transition-none",
        selected
          ? "border-primary ring-2 ring-primary"
          : "hover:border-primary/60 hover:bg-accent/40",
      )}
    >
      <span
        className={cn(
          "flex size-6 shrink-0 items-center justify-center rounded-full border transition-colors",
          selected
            ? "border-primary bg-primary text-primary-foreground"
            : "border-muted-foreground/30 text-transparent group-hover:border-primary/50",
        )}
      >
        <Check className="size-4" aria-hidden />
      </span>
      <span className="flex-1">{children}</span>
    </button>
  );
}

/**
 * An image option tile (aptitude figural). Reserves a fixed box to avoid CLS.
 * Selected = primary ring + a corner check.
 */
export function ImageOption({
  selected,
  onSelect,
  src,
  label,
}: {
  selected: boolean;
  onSelect: () => void;
  src: string;
  label: string;
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      aria-label={label}
      onClick={onSelect}
      className={cn(
        "relative flex min-h-[5.5rem] items-center justify-center rounded-lg border bg-background p-3 transition-colors duration-150",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        "motion-reduce:transition-none",
        selected ? "border-primary ring-2 ring-primary" : "hover:border-primary/60",
      )}
    >
      {selected ? (
        <span className="absolute right-1.5 top-1.5 flex size-5 items-center justify-center rounded-full bg-primary text-primary-foreground">
          <Check className="size-3.5" aria-hidden />
        </span>
      ) : null}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt={label} className="h-16 w-auto" />
    </button>
  );
}

// Selected-state tones run cool→warm across the scale using existing theme
// tokens only (no ad-hoc colors). Low = muted, high = primary/accent so "more"
// reads as positive in the student palette.
const LIKERT_TONE = [
  "data-[selected=true]:border-muted-foreground data-[selected=true]:bg-muted data-[selected=true]:text-foreground data-[selected=true]:ring-muted-foreground/60",
  "data-[selected=true]:border-muted-foreground data-[selected=true]:bg-muted data-[selected=true]:text-foreground data-[selected=true]:ring-muted-foreground/60",
  "data-[selected=true]:border-primary data-[selected=true]:bg-primary/10 data-[selected=true]:text-primary data-[selected=true]:ring-primary",
  "data-[selected=true]:border-accent data-[selected=true]:bg-accent/10 data-[selected=true]:text-accent data-[selected=true]:ring-accent",
  "data-[selected=true]:border-accent data-[selected=true]:bg-accent data-[selected=true]:text-accent-foreground data-[selected=true]:ring-accent",
];

/**
 * A labelled 1–5 Likert scale with large targets. Each point shows its number
 * (tabular) with anchor labels at the ends; the chosen point gets a coloured
 * ring + check. Anchors default to a generic dislike→like scale.
 */
export function LikertScale({
  value,
  onChange,
  labels,
  lowLabel = "Not for me",
  highLabel = "Love it",
  name,
}: {
  value: number | undefined;
  onChange: (v: number) => void;
  /** per-point accessible labels, e.g. ["Strongly dislike", …] */
  labels: string[];
  lowLabel?: string;
  highLabel?: string;
  name?: string;
}) {
  return (
    <div className="flex flex-col gap-2" role="radiogroup" aria-label={name}>
      <div
        className="grid gap-2"
        style={{ gridTemplateColumns: `repeat(${labels.length}, minmax(0, 1fr))` }}
      >
        {labels.map((label, i) => {
          const v = i + 1;
          const selected = value === v;
          return (
            <button
              key={v}
              type="button"
              role="radio"
              aria-checked={selected}
              aria-label={label}
              title={label}
              data-selected={selected}
              onClick={() => onChange(v)}
              className={cn(
                "flex min-h-[3rem] flex-col items-center justify-center gap-0.5 rounded-lg border bg-background py-2.5 text-base font-semibold tabular-nums transition-colors duration-150",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                "motion-reduce:transition-none",
                selected ? "ring-2" : "text-muted-foreground hover:border-primary/50",
                LIKERT_TONE[i],
              )}
            >
              {selected ? <Check className="size-4" aria-hidden /> : v}
            </button>
          );
        })}
      </div>
      <div className="flex justify-between px-0.5 text-xs text-muted-foreground">
        <span>{lowLabel}</span>
        <span>{highLabel}</span>
      </div>
    </div>
  );
}

/** Autosave status pill — calm, reassuring; never alarming. */
export function SaveIndicator({ state }: { state: "idle" | "saving" | "saved" | "error" }) {
  if (state === "idle") {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
        <Cloud className="size-3.5" aria-hidden />
        Autosaves as you go
      </span>
    );
  }
  if (state === "saving") {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
        <Loader2 className="size-3.5 animate-spin motion-reduce:animate-none" aria-hidden />
        Saving…
      </span>
    );
  }
  if (state === "error") {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-destructive">
        <CloudOff className="size-3.5" aria-hidden />
        Couldn&apos;t save
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-accent">
      <Check className="size-3.5" aria-hidden />
      Saved
    </span>
  );
}
