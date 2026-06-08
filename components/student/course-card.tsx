import Link from "next/link";
import { ArrowUpRight, Building2, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { AiSafetyBadge } from "@/components/student/ai-safety-badge";

interface Props {
  slug: string;
  courseName: string;
  stream: string;
  aiSafetyTag: string;
  shortDescription: string;
  tenureYears: string;
  careerClusters: string[];
  instituteCount: number;
  /** When this card is shown from a student's results, their fit %. */
  fitScore?: number;
  /** Marks this as a recommendation reachable across the student's stream. */
  crossStream?: boolean;
}

const STREAM_LABEL: Record<string, string> = {
  science: "Science",
  commerce: "Commerce",
  arts: "Arts",
  vocational: "Vocational",
};

export function CourseCard(p: Props) {
  return (
    <Link
      href={`/courses/${p.slug}`}
      className="group flex min-h-[11rem] flex-col gap-3 rounded-lg border bg-card p-4 shadow-sm outline-none transition-[transform,box-shadow,border-color] duration-200 ease-out hover:-translate-y-0.5 hover:border-primary/50 hover:shadow-md focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 motion-reduce:transition-none motion-reduce:hover:translate-y-0"
    >
      <div className="flex items-start justify-between gap-3">
        <h3 className="font-heading text-base font-semibold leading-snug tracking-tight text-foreground">
          {p.courseName}
        </h3>
        {typeof p.fitScore === "number" ? (
          <span className="inline-flex shrink-0 items-center rounded-full bg-accent px-2 py-0.5 text-xs font-semibold tabular-nums text-accent-foreground">
            {Math.round(p.fitScore)}% fit
          </span>
        ) : (
          <ArrowUpRight
            className="size-4 shrink-0 text-muted-foreground transition-colors group-hover:text-primary"
            aria-hidden
          />
        )}
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        <Badge variant="secondary" className="font-normal">
          {STREAM_LABEL[p.stream] ?? p.stream}
        </Badge>
        {p.careerClusters[0] ? (
          <Badge variant="outline" className="font-normal">
            {p.careerClusters[0]}
          </Badge>
        ) : null}
        <AiSafetyBadge tag={p.aiSafetyTag} />
        {p.crossStream ? (
          <Badge
            variant="outline"
            className="border-amber-300 font-normal text-amber-700 dark:border-amber-900 dark:text-amber-300"
          >
            Cross-stream
          </Badge>
        ) : null}
      </div>

      <p className="line-clamp-2 text-sm leading-relaxed text-muted-foreground">
        {p.shortDescription}
      </p>

      <div className="mt-auto flex flex-wrap items-center gap-x-4 gap-y-1 pt-1 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1">
          <Clock className="size-3.5" aria-hidden />
          <span className="tabular-nums">{p.tenureYears}</span> yr
        </span>
        <span className="inline-flex items-center gap-1">
          <Building2 className="size-3.5" aria-hidden />
          <span className="tabular-nums">{p.instituteCount}</span>{" "}
          {p.instituteCount === 1 ? "institute" : "institutes"}
        </span>
      </div>
    </Link>
  );
}
