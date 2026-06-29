"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";
import { Loader2, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const STREAMS = ["science", "commerce", "arts", "vocational"] as const;
const TAGS = [
  { v: "ai_safe", label: "AI-safe" },
  { v: "ai_augmented", label: "AI-augmented" },
  { v: "ai_risk", label: "AI-exposed" },
] as const;

export function CatalogueFilters() {
  const router = useRouter();
  const params = useSearchParams();
  const [pending, startTransition] = useTransition();
  const [q, setQ] = useState(params.get("q") ?? "");

  const stream = params.get("stream") ?? "";
  const safety = params.get("ai") ?? "";

  function update(next: Record<string, string | null>) {
    const sp = new URLSearchParams(params.toString());
    for (const [k, v] of Object.entries(next)) {
      if (v == null || v === "") sp.delete(k);
      else sp.set(k, v);
    }
    sp.delete("page");
    startTransition(() => router.push(`/courses?${sp.toString()}`));
  }

  function onSearch(e: React.FormEvent) {
    e.preventDefault();
    update({ q: q.trim() || null });
  }

  function clearAll() {
    setQ("");
    startTransition(() => router.push("/courses"));
  }

  const active = q || stream || safety;

  return (
    <div
      className={cn(
        "flex flex-col gap-4 rounded-lg border bg-card p-4 shadow-sm transition-opacity sm:p-5",
        pending && "opacity-70",
      )}
    >
      <form onSubmit={onSearch} className="flex flex-col gap-2 sm:flex-row" role="search">
        <div className="relative min-w-0 flex-1">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <label htmlFor="course-search" className="sr-only">
            Search courses
          </label>
          <Input
            id="course-search"
            type="search"
            inputMode="search"
            placeholder="Search courses…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="h-11 pl-9"
          />
        </div>
        <Button type="submit" disabled={pending} className="h-11 shrink-0 sm:w-auto">
          {pending ? <Loader2 className="animate-spin" aria-hidden="true" /> : null}
          Search
        </Button>
      </form>

      <FilterRow label="Stream">
        <FilterChip label="All" active={!stream} onClick={() => update({ stream: null })} />
        {STREAMS.map((s) => (
          <FilterChip
            key={s}
            label={s[0]!.toUpperCase() + s.slice(1)}
            active={stream === s}
            onClick={() => update({ stream: stream === s ? null : s })}
          />
        ))}
      </FilterRow>

      <FilterRow label="AI exposure">
        <FilterChip label="Any" active={!safety} onClick={() => update({ ai: null })} />
        {TAGS.map((t) => (
          <FilterChip
            key={t.v}
            label={t.label}
            active={safety === t.v}
            onClick={() => update({ ai: safety === t.v ? null : t.v })}
          />
        ))}
      </FilterRow>

      {active ? (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={clearAll}
          className="h-9 self-start text-muted-foreground"
        >
          <X data-icon="inline-start" />
          Clear filters
        </Button>
      ) : null}
    </div>
  );
}

function FilterRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </legend>
      <div className="flex flex-wrap gap-2">{children}</div>
    </fieldset>
  );
}

function FilterChip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "inline-flex min-h-[36px] items-center rounded-full border px-3.5 py-1.5 text-sm font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 motion-reduce:transition-none",
        active
          ? "border-primary bg-primary text-primary-foreground shadow-sm"
          : "border-border bg-background text-foreground hover:bg-muted",
      )}
    >
      {label}
    </button>
  );
}
