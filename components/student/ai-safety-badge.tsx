import { ShieldCheck, Sparkles, TriangleAlert } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * AI-exposure tag for a course, surfaced to students. Status is communicated
 * by color + icon + text together (never color alone) and stays legible in
 * both light and dark themes.
 */
type AiSafetyTag = "ai_safe" | "ai_augmented" | "ai_risk" | (string & {});

const TAG_META: Record<
  "ai_safe" | "ai_augmented" | "ai_risk",
  { label: string; icon: typeof ShieldCheck; tone: string }
> = {
  ai_safe: {
    label: "AI-safe",
    icon: ShieldCheck,
    tone: "border-emerald-300 bg-emerald-50 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/60 dark:text-emerald-300",
  },
  ai_augmented: {
    label: "AI-augmented",
    icon: Sparkles,
    tone: "border-amber-300 bg-amber-50 text-amber-800 dark:border-amber-900 dark:bg-amber-950/60 dark:text-amber-300",
  },
  ai_risk: {
    label: "AI-exposed",
    icon: TriangleAlert,
    tone: "border-rose-300 bg-rose-50 text-rose-800 dark:border-rose-900 dark:bg-rose-950/60 dark:text-rose-300",
  },
};

export function aiSafetyLabel(tag: AiSafetyTag): string {
  return TAG_META[tag as keyof typeof TAG_META]?.label ?? String(tag);
}

export function AiSafetyBadge({
  tag,
  size = "sm",
  className,
}: {
  tag: AiSafetyTag;
  size?: "sm" | "md";
  className?: string;
}) {
  const meta = TAG_META[tag as keyof typeof TAG_META];
  const Icon = meta?.icon ?? TriangleAlert;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border font-medium",
        size === "md" ? "px-2.5 py-1 text-xs" : "px-2 py-0.5 text-[11px]",
        meta?.tone ??
          "border-border bg-muted text-muted-foreground",
        className,
      )}
    >
      <Icon
        className={cn("shrink-0", size === "md" ? "size-3.5" : "size-3")}
        aria-hidden
      />
      {meta?.label ?? String(tag)}
    </span>
  );
}
