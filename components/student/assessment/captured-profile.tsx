import Link from "next/link";
import {
  ArrowRightIcon,
  CompassIcon,
  GraduationCapIcon,
  HeartIcon,
  type LucideIcon,
  SparklesIcon,
  SproutIcon,
  StarIcon,
  TrendingUpIcon,
} from "lucide-react";
import type { ClusterScore, CourseRecommendation } from "@/lib/recommendation/types";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { ResultActions } from "./result-actions";
import type { AptitudeScores, Marks, Riasec, SubjectAffinities, WorkStyleScores } from "./types";

interface Props {
  interestData: Riasec;
  workStyleScores: WorkStyleScores;
  aptitudeScores: AptitudeScores;
  subjectAffinities: SubjectAffinities;
  marks: Marks | null;
  confidence: "high" | "moderate" | "low" | null;
  clusterScores: ClusterScore[];
  recommendedCourses: CourseRecommendation[];
  lowSignal: boolean;
  interestMaxScores: Record<string, number>;
  workStyleMaxScores: Record<string, number>;
}

const RIASEC_LABELS: Record<string, string> = {
  R: "Realistic",
  I: "Investigative",
  A: "Artistic",
  S: "Social",
  E: "Enterprising",
  C: "Conventional",
};

const RIASEC_BLURBS: Record<string, string> = {
  R: "Hands-on, building, doing",
  I: "Ideas, research, figuring things out",
  A: "Creating, designing, expressing",
  S: "Helping, teaching, connecting",
  E: "Leading, persuading, starting things",
  C: "Organising, planning, precision",
};

type Band = "strong" | "moderate" | "developing";

const BAND_META: Record<Band, { label: string; icon: LucideIcon; chip: string; dot: string }> = {
  strong: {
    label: "Strong",
    icon: StarIcon,
    // Emerald = "fit/success". Explicit (not --accent) so it reads green in the
    // admin reuse too, where --accent is indigo, not emerald-teal.
    chip: "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-300",
    dot: "bg-emerald-500",
  },
  moderate: {
    label: "Moderate",
    icon: TrendingUpIcon,
    chip: "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900 dark:bg-amber-950/50 dark:text-amber-300",
    dot: "bg-amber-500",
  },
  developing: {
    label: "Developing",
    icon: SproutIcon,
    chip: "border-border bg-muted text-muted-foreground",
    dot: "bg-muted-foreground/50",
  },
};

const CONFIDENCE_NOTE: Record<string, string> = {
  high: "Your answers look consistent — this is a reliable starting point for what fits you.",
  moderate: "This is a useful starting point for what fits you.",
  low: "Some answers looked rushed, so treat this as a rough first read — you can retake it later for a sharper picture.",
};

/**
 * One staggered reveal slot. Pure CSS via tailwindcss-animate, gated behind
 * `motion-safe:` so `prefers-reduced-motion` users get the final state instantly.
 */
function Reveal({
  children,
  index = 0,
  className,
}: {
  children: React.ReactNode;
  index?: number;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "motion-safe:duration-500 motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-2 motion-safe:fill-mode-both",
        className,
      )}
      style={{ animationDelay: `${Math.min(index, 8) * 70}ms` }}
    >
      {children}
    </div>
  );
}

/** Labelled horizontal bars, scaled to the largest value in the set. */
function BarList({
  entries,
  emphasiseTop = false,
}: {
  entries: Array<{
    key: string;
    label: string;
    value: number;
    maxValue?: number;
    valueLabel?: string;
    blurb?: string;
  }>;
  emphasiseTop?: boolean;
}) {
  return (
    <div className="flex flex-col gap-3.5">
      {entries.map((entry, i) => {
        const scaleMax = Math.max(1, entry.maxValue ?? entry.value);
        const pct = Math.round((entry.value / scaleMax) * 100);
        const isTop = emphasiseTop && i === 0;
        return (
          <div key={entry.key} className="flex flex-col gap-1.5">
            <div className="flex items-baseline justify-between gap-2">
              <span className="flex items-baseline gap-2 text-sm font-medium">
                {entry.label}
                {entry.blurb ? (
                  <span className="text-xs font-normal text-muted-foreground">{entry.blurb}</span>
                ) : null}
              </span>
              <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                {entry.valueLabel ?? entry.value}
              </span>
            </div>
            <div
              className="h-2.5 overflow-hidden rounded-full bg-muted"
              role="img"
              aria-label={`${entry.label}: ${entry.value} out of ${scaleMax} (${pct} percent)`}
            >
              <div
                className={cn(
                  "h-full rounded-full transition-[width] duration-700 ease-out",
                  isTop ? "bg-primary" : "bg-primary/55",
                )}
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

/** Small section heading with a tinted icon tile — used across profile cards. */
function SectionTitle({ icon: Icon, children }: { icon: LucideIcon; children: React.ReactNode }) {
  return (
    <CardTitle className="flex items-center gap-2.5 text-base">
      <span className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
        <Icon className="size-4" aria-hidden />
      </span>
      {children}
    </CardTitle>
  );
}

/**
 * Read-only "Brain Profile" for a completed attempt — the reward moment: a hero
 * with the top career cluster, RIASEC interests, work-style + aptitude bands,
 * subject strengths, marks, and recommended-course cards. Shared with the admin
 * student-detail page, so prop shapes are fixed; presentation is owned here.
 */
export function CapturedProfile({
  interestData,
  workStyleScores,
  aptitudeScores,
  subjectAffinities,
  marks,
  confidence,
  clusterScores,
  recommendedCourses,
  lowSignal,
  interestMaxScores,
  workStyleMaxScores,
}: Props) {
  const interestEntries = Object.entries(interestData)
    .map(([k, v]) => ({
      key: k,
      label: RIASEC_LABELS[k] ?? k,
      value: v,
      maxValue: interestMaxScores[k] ?? 0,
      valueLabel: interestMaxScores[k] ? `${v} / ${interestMaxScores[k]}` : String(v),
      blurb: RIASEC_BLURBS[k],
    }))
    .sort((a, b) => b.value - a.value);
  const workStyleEntries = Object.entries(workStyleScores)
    .map(([k, v]) => ({
      key: k,
      label: k,
      value: v,
      maxValue: workStyleMaxScores[k] ?? 0,
      valueLabel: workStyleMaxScores[k] ? `${v} / ${workStyleMaxScores[k]}` : String(v),
    }))
    .sort((a, b) => b.value - a.value);
  const favouriteSubjects = Object.entries(subjectAffinities)
    .filter(([, v]) => v >= 0.8)
    .sort((a, b) => b[1] - a[1])
    .map(([s]) => s);
  const aptitudeEntries = Object.entries(aptitudeScores);
  const topCluster = clusterScores[0] ?? null;
  const clusterEntries = clusterScores.slice(0, 5).map((c) => ({
    key: c.clusterKey,
    label: c.name,
    value: Math.round(c.score * 100),
    maxValue: 100,
    valueLabel: `${Math.round(c.score * 100)}%`,
  }));

  // Running index so each card reveals a beat after the previous one.
  let slot = 0;

  return (
    <section className="flex flex-col gap-5">
      {/* Hero — the celebratory top of the results. */}
      <Reveal index={slot++}>
        <div className="rounded-lg border bg-card p-5 shadow-sm sm:p-7">
          <div className="flex flex-col gap-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="flex flex-col gap-2">
                <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                  <SparklesIcon className="size-3.5" aria-hidden />
                  Your results are ready
                </span>
                <h1 className="font-heading text-3xl font-bold tracking-tight sm:text-4xl">
                  Your Brain Profile
                </h1>
              </div>
              <ResultActions />
            </div>

            {topCluster ? (
              <div className="flex flex-col gap-1.5">
                <p className="text-sm text-muted-foreground">Your strongest career direction</p>
                <p className="flex items-center gap-2 font-heading text-xl font-semibold sm:text-2xl">
                  <CompassIcon className="size-5 shrink-0 text-accent" aria-hidden />
                  {topCluster.name}
                </p>
              </div>
            ) : null}

            {confidence ? (
              <p className="max-w-prose text-sm text-muted-foreground">
                {CONFIDENCE_NOTE[confidence]}
              </p>
            ) : null}
          </div>
        </div>
      </Reveal>

      {/* Interests (RIASEC). */}
      {interestEntries.length > 0 ? (
        <Reveal index={slot++}>
          <Card>
            <CardHeader>
              <SectionTitle icon={HeartIcon}>What you&apos;re drawn to</SectionTitle>
            </CardHeader>
            <CardContent>
              <BarList entries={interestEntries} emphasiseTop />
            </CardContent>
          </Card>
        </Reveal>
      ) : null}

      {/* Work style. */}
      {workStyleEntries.length > 0 ? (
        <Reveal index={slot++}>
          <Card>
            <CardHeader>
              <SectionTitle icon={CompassIcon}>How you like to work</SectionTitle>
            </CardHeader>
            <CardContent>
              <BarList entries={workStyleEntries} />
            </CardContent>
          </Card>
        </Reveal>
      ) : null}

      {/* Aptitude — friendly band chips (color + icon + text). */}
      {aptitudeEntries.length > 0 ? (
        <Reveal index={slot++}>
          <Card>
            <CardHeader>
              <SectionTitle icon={SparklesIcon}>Your thinking strengths</SectionTitle>
            </CardHeader>
            <CardContent>
              <ul className="flex flex-col gap-2.5">
                {aptitudeEntries.map(([dim, { raw, total, band }]) => {
                  const meta = BAND_META[band] ?? BAND_META.developing;
                  const BandIcon = meta.icon;
                  return (
                    <li
                      key={dim}
                      className="flex items-center justify-between gap-3 rounded-xl border bg-card p-3"
                    >
                      <span className="flex items-center gap-2.5 text-sm font-medium capitalize">
                        <span
                          className={cn("size-2 shrink-0 rounded-full", meta.dot)}
                          aria-hidden
                        />
                        {dim}
                      </span>
                      <span className="flex items-center gap-2.5">
                        <span className="text-xs tabular-nums text-muted-foreground">
                          {raw}/{total}
                        </span>
                        <span
                          className={cn(
                            "inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-semibold",
                            meta.chip,
                          )}
                        >
                          <BandIcon className="size-3.5" aria-hidden />
                          {meta.label}
                        </span>
                      </span>
                    </li>
                  );
                })}
              </ul>
            </CardContent>
          </Card>
        </Reveal>
      ) : null}

      {/* Subjects you enjoy + academic strengths. */}
      {favouriteSubjects.length > 0 || marks ? (
        <Reveal index={slot++}>
          <Card>
            <CardHeader>
              <SectionTitle icon={GraduationCapIcon}>Your academic side</SectionTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-5">
              {favouriteSubjects.length > 0 ? (
                <div className="flex flex-col gap-2.5">
                  <p className="text-sm font-medium text-muted-foreground">Subjects you enjoy</p>
                  <div className="flex flex-wrap gap-2">
                    {favouriteSubjects.map((subject) => (
                      <Badge key={subject} variant="secondary" className="px-3 py-1 text-xs">
                        {subject}
                      </Badge>
                    ))}
                  </div>
                </div>
              ) : null}

              {marks ? (
                <div className="flex flex-col gap-2.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-medium text-muted-foreground">
                      Where you&apos;re strong
                    </p>
                    <span className="text-xs text-muted-foreground">
                      {marks.board} · <span className="capitalize">{marks.stream}</span>
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {marks.strengths.map((subject, i) => (
                      <Badge
                        key={subject}
                        variant={i === 0 ? "default" : "secondary"}
                        className="px-3 py-1 text-xs tabular-nums"
                      >
                        {subject}
                        {marks.subjects[subject] != null ? ` · ${marks.subjects[subject]}%` : ""}
                      </Badge>
                    ))}
                  </div>
                </div>
              ) : null}
            </CardContent>
          </Card>
        </Reveal>
      ) : null}

      {/* Recommendations — or warm low-signal / empty guidance. */}
      {recommendedCourses.length === 0 ? (
        <Reveal index={slot++}>
          <Empty className="border">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <CompassIcon />
              </EmptyMedia>
              <EmptyTitle>No confident match just yet</EmptyTitle>
              <EmptyDescription>
                That usually just means the catalogue is still filling in for your stream. Explore
                everything we have so far — and a counselor can help you read these results.
              </EmptyDescription>
            </EmptyHeader>
            <EmptyContent>
              <Link
                href="/courses"
                className="inline-flex h-10 items-center justify-center gap-1.5 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground ring-offset-background transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                Browse all courses
                <ArrowRightIcon className="size-4" aria-hidden />
              </Link>
            </EmptyContent>
          </Empty>
        </Reveal>
      ) : (
        <Reveal index={slot++} className="flex flex-col gap-5">
          <div className="flex flex-col gap-1.5">
            <h2 className="font-heading text-2xl font-bold tracking-tight">
              {lowSignal ? "Directions worth exploring" : "Courses that fit you"}
            </h2>
            <p className="max-w-prose text-sm text-muted-foreground">
              {lowSignal
                ? "Your answers didn't point to one clear path, so treat these as a broad starting set — retake the assessment later for a sharper read."
                : "Ranked by how well each fits your profile. Tap any course for institutes, fees and sources."}
            </p>
          </div>

          {clusterEntries.length > 0 ? (
            <Card>
              <CardHeader>
                <SectionTitle icon={CompassIcon}>Career clusters that fit you</SectionTitle>
              </CardHeader>
              <CardContent>
                <BarList entries={clusterEntries} emphasiseTop={!lowSignal} />
              </CardContent>
            </Card>
          ) : null}

          <ol className="flex flex-col gap-3">
            {recommendedCourses.map((course, i) => {
              const isTop = i === 0 && !lowSignal;
              return (
                <li key={course.courseId}>
                  <Link
                    href={`/courses/${course.slug}`}
                    className={cn(
                      "group block rounded-lg border bg-card p-4 transition-colors hover:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 sm:p-5",
                      isTop && "border-primary/60 ring-1 ring-primary/30",
                    )}
                  >
                    <div className="flex flex-col gap-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex flex-col gap-1.5">
                          {isTop ? (
                            <span className="inline-flex w-fit items-center gap-1 rounded-full bg-primary/10 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-primary">
                              <StarIcon className="size-3" aria-hidden />
                              Top match
                            </span>
                          ) : null}
                          <h3 className="font-heading text-lg font-semibold leading-tight">
                            {course.courseName}
                          </h3>
                        </div>
                        <span className="flex shrink-0 flex-col items-center rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-300">
                          <span className="text-base font-bold tabular-nums leading-none">
                            {course.fitScore}%
                          </span>
                          <span className="text-[10px] font-medium uppercase tracking-wide">
                            fit
                          </span>
                        </span>
                      </div>

                      {course.reasons.length > 0 ? (
                        <ul className="flex flex-col gap-1.5 text-sm text-muted-foreground">
                          {course.reasons.map((reason) => (
                            <li key={reason} className="flex gap-2">
                              <ArrowRightIcon
                                className="mt-0.5 size-3.5 shrink-0 text-accent"
                                aria-hidden
                              />
                              <span>{reason}</span>
                            </li>
                          ))}
                        </ul>
                      ) : null}

                      <div className="flex items-center justify-between gap-2">
                        {course.crossStream ? (
                          <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-[11px] font-semibold text-amber-800 dark:border-amber-900 dark:bg-amber-950/50 dark:text-amber-300">
                            Cross-stream
                          </span>
                        ) : (
                          <span />
                        )}
                        <span className="inline-flex items-center gap-1 text-sm font-medium text-primary opacity-0 transition-opacity group-hover:opacity-100">
                          View course
                          <ArrowRightIcon className="size-4" aria-hidden />
                        </span>
                      </div>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ol>

          <Link
            href="/courses"
            className="inline-flex items-center justify-center gap-1.5 self-center text-sm font-medium text-muted-foreground underline-offset-4 hover:text-primary hover:underline"
          >
            Browse all courses instead
            <ArrowRightIcon className="size-4" aria-hidden />
          </Link>
        </Reveal>
      )}
    </section>
  );
}
