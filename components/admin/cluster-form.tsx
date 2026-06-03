"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

export function ClusterForm() {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [json, setJson] = useState(
    '{\n  "key": "engineering-technology",\n  "name": "Engineering & Technology",\n  "targetProfile": {"interests":{"I":0.9},"aptitude":{"numerical":0.8},"workStyle":{"Analytical":0.8}},\n  "lensWeights": {"interests":0.3,"aptitude":0.3,"marks":0.3,"workStyle":0.1}\n}',
  );
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setError(null);
    let parsed: unknown;
    try {
      parsed = JSON.parse(json);
    } catch {
      setError("Invalid JSON");
      return;
    }
    const res = await fetch("/api/admin/clusters", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(parsed),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.detail ?? data.error ?? `HTTP ${res.status}`);
      return;
    }
    setError(null);
    start(() => router.refresh());
  }

  return (
    <div className="flex flex-col gap-2 rounded-md border bg-card p-3">
      <label className="text-sm font-medium">New cluster (JSON)</label>
      <textarea
        value={json}
        onChange={(e) => setJson(e.target.value)}
        rows={8}
        className="rounded-md border bg-background p-2 font-mono text-xs"
      />
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
      <button
        onClick={submit}
        disabled={pending}
        className="self-start rounded-md bg-primary px-3 py-1.5 text-sm text-primary-foreground disabled:opacity-50"
      >
        {pending ? "Saving…" : "Create cluster"}
      </button>
    </div>
  );
}
