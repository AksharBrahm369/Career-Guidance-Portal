import Link from "next/link";

interface Props {
  slug: string;
  courseName: string;
  stream: string;
  aiSafetyTag: string;
  shortDescription: string;
  tenureYears: string;
  careerClusters: string[];
  instituteCount: number;
}

const TAG_LABEL: Record<string, string> = {
  ai_safe: "AI-safe",
  ai_augmented: "AI-augmented",
  ai_risk: "AI-risk",
};

const TAG_TONE: Record<string, string> = {
  ai_safe: "bg-emerald-100 text-emerald-900",
  ai_augmented: "bg-amber-100 text-amber-900",
  ai_risk: "bg-rose-100 text-rose-900",
};

export function CourseCard(p: Props) {
  return (
    <Link
      href={`/courses/${p.slug}`}
      className="flex flex-col gap-2 rounded-lg border bg-card p-4 transition hover:border-primary"
    >
      <div className="flex items-start justify-between gap-2">
        <h3 className="text-base font-semibold leading-tight">{p.courseName}</h3>
        <span
          className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium ${
            TAG_TONE[p.aiSafetyTag] ?? "bg-muted"
          }`}
        >
          {TAG_LABEL[p.aiSafetyTag] ?? p.aiSafetyTag}
        </span>
      </div>
      <p className="line-clamp-3 text-sm text-muted-foreground">{p.shortDescription}</p>
      <div className="mt-auto flex flex-wrap gap-1.5 text-[11px] text-muted-foreground">
        <span className="rounded bg-muted px-1.5 py-0.5">{p.stream}</span>
        <span className="rounded bg-muted px-1.5 py-0.5">{p.tenureYears} yrs</span>
        <span className="rounded bg-muted px-1.5 py-0.5">
          {p.instituteCount} {p.instituteCount === 1 ? "institute" : "institutes"}
        </span>
        {p.careerClusters[0] ? (
          <span className="rounded bg-secondary px-1.5 py-0.5">{p.careerClusters[0]}</span>
        ) : null}
      </div>
    </Link>
  );
}
