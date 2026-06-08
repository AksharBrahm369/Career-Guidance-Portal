"use client";

import { ArrowLeft, ArrowRight, Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Sticky bottom action bar (mobile-first). Holds Back/Next, blurs the page
 * under it, and respects the safe-area inset. On larger screens it stays at the
 * end of the flow but un-sticks for a calmer desktop layout.
 */
export function StickyActions({
  onBack,
  onNext,
  backDisabled,
  nextDisabled,
  saving,
  nextLabel = "Next",
  finish = false,
}: {
  onBack?: () => void;
  onNext: () => void;
  backDisabled?: boolean;
  nextDisabled?: boolean;
  saving?: boolean;
  nextLabel?: string;
  finish?: boolean;
}) {
  return (
    <div className="sticky bottom-0 z-10 -mx-4 mt-2 border-t bg-background/85 px-4 py-3 backdrop-blur [padding-bottom:calc(0.75rem+env(safe-area-inset-bottom))] supports-[backdrop-filter]:bg-background/70 sm:-mx-6 sm:px-6">
      <div className="mx-auto flex max-w-2xl items-center gap-3">
        {onBack ? (
          <Button
            type="button"
            variant="ghost"
            size="lg"
            onClick={onBack}
            disabled={backDisabled || saving}
            className="shrink-0"
          >
            <ArrowLeft aria-hidden />
            Back
          </Button>
        ) : null}
        <Button
          type="button"
          size="lg"
          onClick={onNext}
          disabled={nextDisabled || saving}
          className="ml-auto min-w-[8.5rem] flex-1 sm:flex-none"
        >
          {saving ? (
            <>
              <Loader2 className="animate-spin motion-reduce:animate-none" aria-hidden />
              Saving…
            </>
          ) : (
            <>
              {finish ? <Sparkles aria-hidden /> : null}
              {nextLabel}
              {!finish ? <ArrowRight aria-hidden /> : null}
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
