"use client";

import { useState } from "react";
import type { MarksAnswers, Stream } from "./types";

interface Props {
  initial: Partial<MarksAnswers> | undefined;
  onComplete: (answers: MarksAnswers) => void;
  saving: boolean;
}

const STREAMS: { value: Stream; label: string }[] = [
  { value: "science", label: "Science" },
  { value: "commerce", label: "Commerce" },
  { value: "arts", label: "Arts / Humanities" },
  { value: "vocational", label: "Vocational" },
];

const SUGGESTED: Record<Stream, string[]> = {
  science: ["Physics", "Chemistry", "Mathematics", "Biology", "English"],
  commerce: ["Accountancy", "Business Studies", "Economics", "Mathematics", "English"],
  arts: ["History", "Political Science", "Geography", "Economics", "English"],
  vocational: ["Core Subject", "English", "Skill Subject"],
};

interface Row {
  name: string;
  value: string;
}

function seedRows(initial: Partial<MarksAnswers> | undefined): Row[] {
  const subjects = initial?.subjects;
  if (subjects && Object.keys(subjects).length > 0) {
    return Object.entries(subjects).map(([name, value]) => ({ name, value: String(value) }));
  }
  const stream = (initial?.stream as Stream) ?? "science";
  return SUGGESTED[stream].map((name) => ({ name, value: "" }));
}

/**
 * Marks module — board (free text), stream (select), and per-subject percentage
 * inputs. Saved as `{ board, stream, subjects }`; strength ranking is derived
 * server-side. Distinct shape from the choice modules, so it owns its inputs.
 */
export function MarksModule({ initial, onComplete, saving }: Props) {
  const [board, setBoard] = useState(initial?.board ?? "");
  const [stream, setStream] = useState<Stream>((initial?.stream as Stream) ?? "science");
  const [rows, setRows] = useState<Row[]>(() => seedRows(initial));

  function onStreamChange(next: Stream) {
    setStream(next);
    // Only reseed subject rows if the student hasn't entered anything yet.
    setRows((cur) =>
      cur.some((r) => r.name.trim() || r.value.trim())
        ? cur
        : SUGGESTED[next].map((name) => ({ name, value: "" })),
    );
  }

  const validRows = rows.filter((r) => r.name.trim() && r.value.trim() !== "");
  const numbersOk = validRows.every((r) => {
    const n = Number(r.value);
    return Number.isFinite(n) && n >= 0 && n <= 100;
  });
  const canSubmit = board.trim().length > 0 && validRows.length > 0 && numbersOk;

  const inputCls = "w-full rounded-md border border-input bg-background px-3 py-2 text-sm";

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!canSubmit) return;
        const subjects: Record<string, number> = {};
        for (const r of validRows) subjects[r.name.trim()] = Number(r.value);
        onComplete({ board: board.trim(), stream, subjects });
      }}
      className="flex flex-col gap-4"
    >
      <div className="flex flex-col gap-1">
        <h2 className="text-lg font-semibold">Your recent marks</h2>
        <p className="text-sm text-muted-foreground">
          Enter your latest percentage (0–100) per subject. These stay on your board&apos;s scale.
        </p>
      </div>

      <div className="flex flex-col gap-3 rounded-lg border bg-card p-4">
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium">Board</span>
          <input
            className={inputCls}
            placeholder="e.g. CBSE, ICSE, State Board"
            value={board}
            onChange={(e) => setBoard(e.target.value)}
            required
          />
        </label>

        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium">Stream</span>
          <select
            className={inputCls}
            value={stream}
            onChange={(e) => onStreamChange(e.target.value as Stream)}
          >
            {STREAMS.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="flex flex-col gap-2 rounded-lg border bg-card p-4">
        <span className="text-sm font-medium">Subjects &amp; marks</span>
        {rows.map((row, i) => (
          <div key={i} className="flex items-center gap-2">
            <input
              className={`${inputCls} flex-1`}
              placeholder="Subject"
              value={row.name}
              onChange={(e) =>
                setRows((cur) => cur.map((r, j) => (j === i ? { ...r, name: e.target.value } : r)))
              }
            />
            <input
              className={`${inputCls} w-20`}
              type="number"
              inputMode="numeric"
              min={0}
              max={100}
              placeholder="%"
              value={row.value}
              onChange={(e) =>
                setRows((cur) => cur.map((r, j) => (j === i ? { ...r, value: e.target.value } : r)))
              }
            />
            <button
              type="button"
              aria-label="Remove subject"
              onClick={() => setRows((cur) => cur.filter((_, j) => j !== i))}
              className="shrink-0 rounded-md border px-2 py-2 text-xs text-muted-foreground hover:border-destructive hover:text-destructive"
            >
              Remove
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={() => setRows((cur) => [...cur, { name: "", value: "" }])}
          className="self-start rounded-md border px-3 py-1.5 text-xs hover:border-primary"
        >
          + Add subject
        </button>
      </div>

      {!numbersOk ? (
        <p className="text-xs text-destructive">Marks must be numbers between 0 and 100.</p>
      ) : null}

      <button
        type="submit"
        disabled={!canSubmit || saving}
        className="rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground disabled:opacity-50"
      >
        {saving ? "Saving…" : "Finish & see my profile"}
      </button>
    </form>
  );
}
