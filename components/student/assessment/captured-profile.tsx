import Link from "next/link";
import type { ClusterScore, CourseRecommendation } from "@/lib/recommendation/types";
import { PrintResultButton } from "./result-actions";
import type { AptitudeScores, Marks, Riasec, WorkStyleScores } from "./types";

interface Props {
  interestData: Riasec;
  workStyleScores: WorkStyleScores;
  aptitudeScores: AptitudeScores;
  marks: Marks | null;
  confidence: "high" | "moderate" | "low" | null;
  clusterScores: ClusterScore[];
  recommendedCourses: CourseRecommendation[];
  lowSignal: boolean;
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
  clusterScores,
  recommendedCourses,
  lowSignal,
}: Props) {
  const interestEntries = Object.entries(interestData)
    .map(([k, v]) => [RIASEC_LABELS[k] ?? k, v] as [string, number])
    .sort((a, b) => b[1] - a[1]);
  const workStyleEntries = Object.entries(workStyleScores).sort((a, b) => b[1] - a[1]);
  const aptitudeEntries = Object.entries(aptitudeScores);
  const clusterEntries = clusterScores
    .slice(0, 5)
    .map((c) => [c.name, Math.round(c.score * 100)] as [string, number]);

  return (
    <section className="flex flex-col gap-6">
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h1 className="text-xl font-semibold">Your Brain Profile</h1>
          {confidence ? (
            <p className="text-sm text-muted-foreground">{CONFIDENCE_NOTE[confidence]}</p>
          ) : null}
        </div>
        <PrintResultButton />
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

      {recommendedCourses.length === 0 ? (
        <div className="flex flex-col gap-3 rounded-lg border border-dashed bg-muted/40 p-4">
          <p className="text-sm">
            <span className="font-medium">We couldn&apos;t find a confident match yet.</span> That
            often just means the catalogue is still filling in for your stream. It&apos;s worth
            talking to a counselor and exploring the full catalogue while we add more courses.
          </p>
          <Link
            href="/courses"
            className="self-start rounded-md border px-3 py-1.5 text-sm hover:border-primary"
          >
            Browse all courses
          </Link>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <h2 className="text-lg font-semibold">
              {lowSignal ? "Directions worth exploring" : "Your recommended courses"}
            </h2>
            <p className="text-sm text-muted-foreground">
              {lowSignal
                ? "Your answers didn't point to one clear path, so treat these as a broad starting set — you can retake the assessment later for a sharper read."
                : "Ranked by how well each fits your profile. Tap any course for institutes, fees and sources."}
            </p>
          </div>

          {clusterEntries.length > 0 ? (
            <div className="rounded-lg border bg-card p-4">
              <BarList entries={clusterEntries} label="Career clusters that fit you" />
            </div>
          ) : null}

          <ol className="flex flex-col gap-3">
            {recommendedCourses.map((course, i) => {
              const isTop = i === 0 && !lowSignal;
              return (
                <li key={course.courseId}>
                  <Link
                    href={`/courses/${course.slug}`}
                    className={`flex flex-col gap-2 rounded-lg border bg-card p-4 transition hover:border-primary ${
                      isTop ? "border-primary ring-1 ring-primary" : ""
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex flex-col gap-0.5">
                        {isTop ? (
                          <span className="text-[11px] font-medium uppercase tracking-wide text-primary">
                            Top match
                          </span>
                        ) : null}
                        <h3 className="text-base font-semibold leading-tight">{course.courseName}</h3>
                      </div>
                      <span className="shrink-0 rounded bg-secondary px-2 py-0.5 text-xs font-medium tabular-nums">
                        {course.fitScore}% fit
                      </span>
                    </div>
                    <ul className="flex flex-col gap-1 text-sm text-muted-foreground">
                      {course.reasons.map((reason) => (
                        <li key={reason} className="flex gap-1.5">
                          <span aria-hidden className="text-primary">
                            ·
                          </span>
                          {reason}
                        </li>
                      ))}
                    </ul>
                    {course.crossStream ? (
                      <span className="self-start rounded bg-amber-100 px-1.5 py-0.5 text-[11px] font-medium text-amber-900">
                        Cross-stream
                      </span>
                    ) : null}
                  </Link>
                </li>
              );
            })}
          </ol>
        </div>
      )}
    </section>
  );
}
