"use client";

import { useState } from "react";
import { CheckIcon, PrinterIcon, Share2Icon } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Secondary actions for the Brain Profile results: save-as-PDF (browser print)
 * and a lightweight share (Web Share API where available, clipboard fallback).
 * Hidden when printing. Kept deliberately quiet so the profile stays the hero.
 */
export function ResultActions() {
  return (
    <div className="flex items-center gap-2 print:hidden">
      <ShareResultButton />
      <PrintResultButton />
    </div>
  );
}

/** Trigger the browser's print / save-as-PDF dialog. */
export function PrintResultButton() {
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={() => window.print()}
      className="gap-1.5"
    >
      <PrinterIcon aria-hidden />
      Save as PDF
    </Button>
  );
}

/** Share the results page — native sheet on mobile, clipboard fallback elsewhere. */
function ShareResultButton() {
  const [copied, setCopied] = useState(false);

  async function handleShare() {
    if (typeof window === "undefined") return;
    const url = window.location.href;
    const shareData = {
      title: "My Brain Profile",
      text: "Here's what my career assessment says about me.",
      url,
    };

    // Web Share API (mobile-first). Falls back to clipboard on desktop.
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share(shareData);
        return;
      } catch {
        // user cancelled or share failed — fall through to clipboard
      }
    }

    try {
      await navigator.clipboard?.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard blocked — silently ignore; nothing actionable for the student
    }
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      onClick={handleShare}
      className="gap-1.5"
      aria-live="polite"
    >
      {copied ? (
        <>
          <CheckIcon aria-hidden className="text-accent" />
          Link copied
        </>
      ) : (
        <>
          <Share2Icon aria-hidden />
          Share
        </>
      )}
    </Button>
  );
}
