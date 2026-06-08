"use client";

import { useState } from "react";
import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { MarksAnswers, Stream } from "./types";
import { ModuleIntro, QuestionCard } from "./wizard-ui";
import { StickyActions } from "./sticky-actions";

interface Props {
  initial: Partial<MarksAnswers> | undefined;
  onComplete: (answers: MarksAnswers) => void;
  onBack?: () => void;
  saving: boolean;
  step: number;
  total: number;
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
 *
 * Presentation: a calm two-card section (basics + subjects) with shadcn Field
 * inputs, a friendly subject/marks table, and the closing "see my profile" CTA.
 */
export function MarksModule({ initial, onComplete, onBack, saving, step, total }: Props) {
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

  function submit() {
    if (!canSubmit) return;
    const subjects: Record<string, number> = {};
    for (const r of validRows) subjects[r.name.trim()] = Number(r.value);
    onComplete({ board: board.trim(), stream, subjects });
  }

  return (
    <div className="flex flex-col gap-6">
      <ModuleIntro
        step={step}
        total={total}
        title="Your recent marks"
        description="Last bit! Add your latest percentage per subject. These stay on your board's own scale."
      />

      <QuestionCard>
        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="board">Board</FieldLabel>
            <Input
              id="board"
              placeholder="e.g. CBSE, ICSE, State Board"
              value={board}
              onChange={(e) => setBoard(e.target.value)}
              required
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="stream">Stream</FieldLabel>
            <Select value={stream} onValueChange={(v) => onStreamChange(v as Stream)}>
              <SelectTrigger id="stream">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {STREAMS.map((s) => (
                    <SelectItem key={s.value} value={s.value}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
            <FieldDescription>We use this to suggest the usual subjects.</FieldDescription>
          </Field>
        </FieldGroup>
      </QuestionCard>

      <QuestionCard>
        <div className="flex flex-col gap-1">
          <h3 className="font-heading text-base font-semibold">Subjects &amp; marks</h3>
          <p className="text-sm text-muted-foreground">Enter a percentage from 0 to 100.</p>
        </div>

        <div className="flex flex-col gap-2.5">
          {rows.map((row, i) => (
            <div key={i} className="flex items-center gap-2">
              <Input
                aria-label={`Subject ${i + 1}`}
                className="flex-1"
                placeholder="Subject"
                value={row.name}
                onChange={(e) =>
                  setRows((cur) =>
                    cur.map((r, j) => (j === i ? { ...r, name: e.target.value } : r)),
                  )
                }
              />
              <Input
                aria-label={`${row.name || `Subject ${i + 1}`} marks (%)`}
                className="w-20 text-center tabular-nums"
                type="number"
                inputMode="numeric"
                min={0}
                max={100}
                placeholder="%"
                value={row.value}
                onChange={(e) =>
                  setRows((cur) =>
                    cur.map((r, j) => (j === i ? { ...r, value: e.target.value } : r)),
                  )
                }
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label={`Remove ${row.name || `subject ${i + 1}`}`}
                onClick={() => setRows((cur) => cur.filter((_, j) => j !== i))}
                className="shrink-0 text-muted-foreground hover:text-destructive"
              >
                <X aria-hidden />
              </Button>
            </div>
          ))}
        </div>

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setRows((cur) => [...cur, { name: "", value: "" }])}
          className="self-start"
        >
          <Plus aria-hidden />
          Add subject
        </Button>

        {!numbersOk ? (
          <p className="text-sm font-medium text-destructive">
            Marks must be numbers between 0 and 100.
          </p>
        ) : null}
      </QuestionCard>

      <StickyActions
        onBack={onBack}
        onNext={submit}
        nextDisabled={!canSubmit}
        saving={saving}
        finish
        nextLabel="See my profile"
      />
    </div>
  );
}
