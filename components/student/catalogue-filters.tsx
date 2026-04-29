"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";

const STREAMS = ["science", "commerce", "arts", "vocational"] as const;
const TAGS = [
  { v: "ai_safe", label: "AI-safe" },
  { v: "ai_augmented", label: "AI-augmented" },
  { v: "ai_risk", label: "AI-risk" },
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
    <div className="flex flex-col gap-3 rounded-md border bg-card p-3 sm:p-4">
      <form onSubmit={onSearch} className="flex gap-2">
        <input
          type="search"
          inputMode="search"
          placeholder="Search courses…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="min-w-0 flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm"
        />
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-primary px-3 py-2 text-sm text-primary-foreground disabled:opacity-50"
        >
          Search
        </button>
      </form>

      <div className="flex flex-wrap gap-1.5 text-xs">
        <Chip label="All streams" active={!stream} onClick={() => update({ stream: null })} />
        {STREAMS.map((s) => (
          <Chip
            key={s}
            label={s[0]!.toUpperCase() + s.slice(1)}
            active={stream === s}
            onClick={() => update({ stream: stream === s ? null : s })}
          />
        ))}
      </div>

      <div className="flex flex-wrap gap-1.5 text-xs">
        <Chip label="Any AI exposure" active={!safety} onClick={() => update({ ai: null })} />
        {TAGS.map((t) => (
          <Chip
            key={t.v}
            label={t.label}
            active={safety === t.v}
            onClick={() => update({ ai: safety === t.v ? null : t.v })}
          />
        ))}
      </div>

      {active ? (
        <button
          type="button"
          onClick={clearAll}
          className="self-start text-xs text-muted-foreground underline"
        >
          Clear filters
        </button>
      ) : null}
    </div>
  );
}

function Chip({
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
      className={`rounded-full border px-2.5 py-1 transition ${
        active
          ? "border-primary bg-primary text-primary-foreground"
          : "border-input bg-background text-foreground hover:bg-muted"
      }`}
    >
      {label}
    </button>
  );
}
