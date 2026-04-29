import Link from "next/link";
import { notFound } from "next/navigation";
import { QAChat } from "@/components/student/qa-chat";
import {
  getPublishedCourseBySlug,
  getRelatedPublishedCourses,
} from "@/lib/student/courses";

export const dynamic = "force-dynamic";

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

export default async function CourseDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const data = await getPublishedCourseBySlug(slug);
  if (!data) notFound();
  const { course, institutes: linkedInstitutes } = data;

  const related = await getRelatedPublishedCourses(course.id, course.careerClusters);

  return (
    <article className="flex flex-col gap-6">
      <Link href="/courses" className="text-xs text-muted-foreground underline">
        ← Back to catalogue
      </Link>

      <header className="flex flex-col gap-3">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <h1 className="text-2xl font-semibold sm:text-3xl">{course.courseName}</h1>
          <span
            className={`shrink-0 rounded px-2 py-1 text-xs font-medium ${
              TAG_TONE[course.aiSafetyTag] ?? "bg-muted"
            }`}
          >
            {TAG_LABEL[course.aiSafetyTag] ?? course.aiSafetyTag}
          </span>
        </div>
        <div className="flex flex-wrap gap-1.5 text-xs">
          <Tag>{course.stream}</Tag>
          <Tag>{course.tenureYears} yrs</Tag>
          {course.careerClusters.map((c) => (
            <Tag key={c} tone="secondary">
              {c}
            </Tag>
          ))}
        </div>
      </header>

      <section>
        <h2 className="mb-1 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          About
        </h2>
        <p className="whitespace-pre-line text-sm leading-relaxed sm:text-base">
          {course.description}
        </p>
      </section>

      {course.aiSafetyReasoning ? (
        <section className="rounded-md border bg-muted/30 p-3">
          <h2 className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            AI exposure: why &ldquo;{TAG_LABEL[course.aiSafetyTag] ?? course.aiSafetyTag}&rdquo;
          </h2>
          <p className="text-sm">{course.aiSafetyReasoning}</p>
        </section>
      ) : null}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Field label="Eligibility">{course.eligibilityCriteria}</Field>
        <Field label="Entrance exams">
          {course.entranceExams.length ? course.entranceExams.join(", ") : "None"}
        </Field>
        <Field label="Tenure">{course.tenureYears} years</Field>
        <Field label="Fees (annual, INR)">{formatFees(course.feesMinInr, course.feesMaxInr)}</Field>
      </div>

      <section>
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Where it&apos;s offered ({linkedInstitutes.length})
        </h2>
        {linkedInstitutes.length === 0 ? (
          <p className="text-sm text-muted-foreground">No institutes linked yet.</p>
        ) : (
          <ul className="divide-y rounded-md border bg-card">
            {linkedInstitutes.map((i) => (
              <li key={i.id} className="flex items-center justify-between gap-2 p-3 text-sm">
                <div className="min-w-0">
                  <div className="truncate font-medium">{i.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {i.city}, {i.state} · {i.instituteType}
                  </div>
                </div>
                {i.websiteUrl ? (
                  <a
                    href={i.websiteUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="shrink-0 text-xs underline"
                  >
                    Visit ↗
                  </a>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>

      {course.sourceUrls.length > 0 ? (
        <section>
          <h2 className="mb-1 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Sources
          </h2>
          <ul className="space-y-1 text-xs">
            {course.sourceUrls.map((u) => (
              <li key={u}>
                <a href={u} target="_blank" rel="noreferrer" className="underline break-all">
                  {u}
                </a>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section aria-label="Ask about this course">
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Ask about this course
        </h2>
        <QAChat courseId={course.id} courseName={course.courseName} />
      </section>

      {related.length > 0 ? (
        <section>
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Related courses
          </h2>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {related.map((r) => (
              <Link
                key={r.id}
                href={`/courses/${r.slug}`}
                className="rounded-md border bg-card p-3 text-sm hover:border-primary"
              >
                <div className="font-medium">{r.courseName}</div>
                <div className="text-xs text-muted-foreground">
                  {r.stream} · {TAG_LABEL[r.aiSafetyTag] ?? r.aiSafetyTag}
                </div>
              </Link>
            ))}
          </div>
        </section>
      ) : null}
    </article>
  );
}

function Tag({
  children,
  tone = "muted",
}: {
  children: React.ReactNode;
  tone?: "muted" | "secondary";
}) {
  const cls =
    tone === "secondary" ? "bg-secondary text-secondary-foreground" : "bg-muted text-foreground";
  return <span className={`rounded px-2 py-0.5 ${cls}`}>{children}</span>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="rounded-md border bg-card p-3">
      <div className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="mt-1 text-sm">{children}</div>
    </div>
  );
}

function formatFees(min: string | null, max: string | null): string {
  if (!min && !max) return "Not specified";
  const fmt = (s: string) => `₹${Number(s).toLocaleString("en-IN")}`;
  if (min && max && min !== max) return `${fmt(min)} – ${fmt(max)}`;
  return fmt(min ?? max!);
}
