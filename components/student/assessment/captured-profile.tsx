import Link from "next/link";
import type { AptitudeScores, Marks, Riasec, WorkStyleScores } from "./types";

interface Props {
  interestData: Riasec;
  workStyleScores: WorkStyleScores;
  aptitudeScores: AptitudeScores;
  marks: Marks | null;
  confidence: "high" | "moderate" | "low" | null;
}

const RIASEC_LABELS: Record<string, string> = {
  R: "Realistic",
  I: "Investigative",
  A: "Artistic",
  S: "Social",
  E: "Enterprising",
  C: "Conventional",
};

const BAND_TONE: Record<string, string> = {
  strong: "bg-emerald-100 text-emerald-900",
  moderate: "bg-amber-100 text-amber-900",
  developing: "bg-slate-100 text-slate-700",
};

const CONFIDENCE_NOTE: Record<string, string> = {
  high: "Your answers look consistent — this profile is a reliable starting point.",
  moderate: "This profile is a useful starting point.",
  low: "Some answers looked rushed, so treat this as a rough first read — you can retake it later for a sharper picture.",
};

/** Horizontal bar list scaled relative to the largest value in the set. */
function BarList({ entries, label }: { entries: [string, number][]; label: string }) {
  const max = Math.max(1, ...entries.map(([, v]) => v));
  return (
    <div className="flex flex-col gap-2">
      <h3 className="text-sm font-semibold">{label}</h3>
      <div className="flex flex-col gap-1.5">
        {entries.map(([key, value]) => (
          <div key={key} className="flex items-center gap-2">
            <span className="w-28 shrink-0 text-xs text-muted-foreground">{key}</span>
            <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary"
                style={{ width: `${(value / max) * 100}%` }}
              />
            </div>
            <span className="w-8 shrink-0 text-right text-xs tabular-nums text-muted-foreground">
              {value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Read-only "Brain Profile" for a completed attempt: RIASEC interests,
 * work-style traits, aptitude bands, and marks strengths. Recommendations
 * (clusters → courses → institutes) arrive in the next milestone.
 */
export function CapturedProfile({
  interestData,
  workStyleScores,
  aptitudeScores,
  marks,
  confidence,
}: Props) {
  const interestEntries = Object.entries(interestData)
    .map(([k, v]) => [RIASEC_LABELS[k] ?? k, v] as [string, number])
    .sort((a, b) => b[1] - a[1]);
  const workStyleEntries = Object.entries(workStyleScores).sort((a, b) => b[1] - a[1]);
  const aptitudeEntries = Object.entries(aptitudeScores);

  return (
    <section className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-xl font-semibold">Your Brain Profile</h1>
        {confidence ? (
          <p className="text-sm text-muted-foreground">{CONFIDENCE_NOTE[confidence]}</p>
        ) : null}
      </div>

      {interestEntries.length > 0 ? (
        <div className="rounded-lg border bg-card p-4">
          <BarList entries={interestEntries} label="Interests (RIASEC)" />
        </div>
      ) : null}

      {workStyleEntries.length > 0 ? (
        <div className="rounded-lg border bg-card p-4">
          <BarList entries={workStyleEntries} label="How you like to work" />
        </div>
      ) : null}

      {aptitudeEntries.length > 0 ? (
        <div className="flex flex-col gap-2 rounded-lg border bg-card p-4">
          <h3 className="text-sm font-semibold">Aptitude</h3>
          <div className="flex flex-col gap-1.5">
            {aptitudeEntries.map(([dim, { raw, total, band }]) => (
              <div key={dim} className="flex items-center justify-between gap-2 text-sm">
                <span className="capitalize">{dim}</span>
                <span className="flex items-center gap-2">
                  <span className="text-xs tabular-nums text-muted-foreground">
                    {raw}/{total}
                  </span>
                  <span
                    className={`rounded px-1.5 py-0.5 text-[11px] font-medium capitalize ${
                      BAND_TONE[band] ?? "bg-muted"
                    }`}
                  >
                    {band}
                  </span>
                </span>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {marks ? (
        <div className="flex flex-col gap-2 rounded-lg border bg-card p-4">
          <h3 className="text-sm font-semibold">Academic strengths</h3>
          <p className="text-xs text-muted-foreground">
            {marks.board} · <span className="capitalize">{marks.stream}</span>
          </p>
          <div className="flex flex-wrap gap-1.5">
            {marks.strengths.map((subject, i) => (
              <span
                key={subject}
                className={`rounded px-2 py-0.5 text-xs ${
                  i === 0 ? "bg-secondary font-medium" : "bg-muted text-muted-foreground"
                }`}
              >
                {subject}
                {marks.subjects[subject] != null ? ` · ${marks.subjects[subject]}%` : ""}
              </span>
            ))}
          </div>
        </div>
      ) : null}

      <div className="flex flex-col gap-3 rounded-lg border border-dashed bg-muted/40 p-4">
        <p className="text-sm">
          <span className="font-medium">Your course recommendations are coming next.</span> We&apos;ll
          match this profile to career clusters and the courses and institutes that fit you.
        </p>
        <Link
          href="/courses"
          className="self-start rounded-md border px-3 py-1.5 text-sm hover:border-primary"
        >
          Browse courses meanwhile
        </Link>
      </div>
    </section>
  );
}
