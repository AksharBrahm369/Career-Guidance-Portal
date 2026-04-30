"use client";

import { useState } from "react";

type Status = "ok" | "dead" | "unknown";

interface VerifyResult {
  url: string;
  status: Status;
  httpStatus?: number;
  error?: string;
}

interface Props {
  courseId: string;
  initialUrls: string[];
  /** Called with the latest URL list whenever the admin edits it. */
  onChange: (urls: string[]) => void;
  editing: boolean;
}

const TONE: Record<Status, string> = {
  ok: "bg-emerald-100 text-emerald-900",
  dead: "bg-rose-100 text-rose-900",
  unknown: "bg-muted text-muted-foreground",
};
const LABEL: Record<Status, string> = {
  ok: "verified",
  dead: "broken",
  unknown: "unknown",
};

export function SourceUrlsEditor({ courseId, initialUrls, onChange, editing }: Props) {
  const [urls, setUrls] = useState<string[]>(initialUrls);
  const [statusByUrl, setStatusByUrl] = useState<Record<string, Status>>({});
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [draftNew, setDraftNew] = useState("");

  function commit(next: string[]) {
    setUrls(next);
    onChange(next);
  }

  function remove(idx: number) {
    commit(urls.filter((_, i) => i !== idx));
  }

  function add() {
    const v = draftNew.trim();
    if (!v) return;
    try {
      new URL(v);
    } catch {
      setError("Not a valid URL.");
      return;
    }
    if (urls.includes(v)) {
      setError("URL is already in the list.");
      return;
    }
    setError(null);
    setDraftNew("");
    commit([...urls, v]);
  }

  async function verifyAll() {
    if (urls.length === 0) return;
    setVerifying(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/courses/${courseId}/verify-sources`, {
        method: "POST",
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? `HTTP ${res.status}`);
        return;
      }
      const data = (await res.json()) as { results: VerifyResult[] };
      const map: Record<string, Status> = {};
      for (const r of data.results) map[r.url] = r.status;
      setStatusByUrl(map);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setVerifying(false);
    }
  }

  if (urls.length === 0 && !editing) {
    return <p className="text-xs text-muted-foreground">No source URLs.</p>;
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs uppercase tracking-wide text-muted-foreground">
          Sources ({urls.length})
        </span>
        <button
          type="button"
          onClick={verifyAll}
          disabled={verifying || urls.length === 0}
          className="rounded-md border px-2 py-1 text-xs disabled:opacity-50"
        >
          {verifying ? "Verifying…" : "Verify all"}
        </button>
      </div>

      {urls.length === 0 ? (
        <p className="text-xs text-muted-foreground">No source URLs yet.</p>
      ) : (
        <ul className="flex flex-col gap-1">
          {urls.map((u, idx) => {
            const status = statusByUrl[u];
            return (
              <li
                key={u}
                className="flex items-center justify-between gap-2 rounded border bg-background/50 px-2 py-1 text-xs"
              >
                <a
                  href={u}
                  target="_blank"
                  rel="noreferrer"
                  className="min-w-0 truncate underline"
                >
                  {u}
                </a>
                <div className="flex shrink-0 items-center gap-1.5">
                  {status ? (
                    <span className={`rounded px-1.5 py-0.5 text-[10px] ${TONE[status]}`}>
                      {LABEL[status]}
                    </span>
                  ) : (
                    <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
                      unchecked
                    </span>
                  )}
                  {editing ? (
                    <button
                      type="button"
                      onClick={() => remove(idx)}
                      aria-label={`Remove ${u}`}
                      className="rounded border px-1.5 py-0.5 text-[10px] text-destructive"
                    >
                      Remove
                    </button>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {editing ? (
        <div className="flex gap-1.5">
          <input
            type="url"
            placeholder="https://…"
            value={draftNew}
            onChange={(e) => setDraftNew(e.target.value)}
            className="min-w-0 flex-1 rounded-md border border-input bg-background px-2 py-1 text-xs"
          />
          <button
            type="button"
            onClick={add}
            disabled={!draftNew.trim() || urls.length >= 8}
            className="rounded-md border px-2 py-1 text-xs disabled:opacity-50"
          >
            Add
          </button>
        </div>
      ) : null}

      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  );
}
