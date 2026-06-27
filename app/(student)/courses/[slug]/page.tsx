import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  Banknote,
  BookOpen,
  Building2,
  Clock,
  ExternalLink,
  GraduationCap,
  Info,
  Link2,
  MapPin,
  MessagesSquare,
  ScrollText,
} from "lucide-react";
import { QAChat } from "@/components/student/qa-chat";
import { AiSafetyBadge } from "@/components/student/ai-safety-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  getInstitutesForCourse,
  getPublishedLearningResourcesForCourse,
  getPublishedCourseRowBySlug,
  getRelatedPublishedCourses,
} from "@/lib/student/courses";

export const dynamic = "force-dynamic";

const STREAM_LABEL: Record<string, string> = {
  science: "Science",
  commerce: "Commerce",
  arts: "Arts",
  vocational: "Vocational",
};

export default async function CourseDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const course = await getPublishedCourseRowBySlug(slug);
  if (!course) notFound();

  // institutes and related courses both depend only on the resolved course
  // (its id + clusters) and are independent of each other — fetch in parallel
  // instead of serializing related behind the institutes round-trip.
  const [linkedInstitutes, learningResources, related] = await Promise.all([
    getInstitutesForCourse(course.id),
    getPublishedLearningResourcesForCourse(course.id),
    getRelatedPublishedCourses(course.id, course.careerClusters),
  ]);

  return (
    <article className="flex flex-col gap-6">
      <Button asChild variant="ghost" size="sm" className="-ml-2 self-start text-muted-foreground">
        <Link href="/courses">
          <ArrowLeft data-icon="inline-start" />
          Back to catalogue
        </Link>
      </Button>

      {/* Header */}
      <header className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary" className="font-normal">
            {STREAM_LABEL[course.stream] ?? course.stream}
          </Badge>
          <AiSafetyBadge tag={course.aiSafetyTag} size="md" />
        </div>

        <h1 className="font-heading text-3xl font-bold tracking-tight sm:text-4xl">
          {course.courseName}
        </h1>

        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <Clock className="size-4" aria-hidden />
            <span className="tabular-nums">{course.tenureYears}</span> year
            {course.tenureYears === "1" ? "" : "s"}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Building2 className="size-4" aria-hidden />
            <span className="tabular-nums">{linkedInstitutes.length}</span>{" "}
            {linkedInstitutes.length === 1 ? "institute" : "institutes"}
          </span>
          {course.careerClusters.length > 0 ? (
            <span className="inline-flex flex-wrap items-center gap-1.5">
              {course.careerClusters.map((c: string) => (
                <Badge key={c} variant="outline" className="font-normal">
                  {c}
                </Badge>
              ))}
            </span>
          ) : null}
        </div>
      </header>

      {/* Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Info className="size-5 text-primary" aria-hidden />
            Overview
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <p className="whitespace-pre-line text-sm leading-relaxed text-foreground/90 sm:text-base">
            {course.description}
          </p>
          {course.aiSafetyReasoning ? (
            <>
              <Separator />
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <AiSafetyBadge tag={course.aiSafetyTag} />
                  <span className="text-muted-foreground">What this means for your future</span>
                </div>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {course.aiSafetyReasoning}
                </p>
              </div>
            </>
          ) : null}
        </CardContent>
      </Card>

      {/* Eligibility & exams + Fees */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <GraduationCap className="size-5 text-primary" aria-hidden />
              Eligibility &amp; exams
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <DetailRow label="Who can apply">{course.eligibilityCriteria}</DetailRow>
            <Separator />
            <DetailRow label="Entrance exams">
              {course.entranceExams.length ? (
                <div className="flex flex-wrap gap-1.5">
                  {course.entranceExams.map((e: string) => (
                    <Badge key={e} variant="outline" className="font-normal">
                      {e}
                    </Badge>
                  ))}
                </div>
              ) : (
                "No entrance exam required"
              )}
            </DetailRow>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Banknote className="size-5 text-primary" aria-hidden />
              Fees
            </CardTitle>
            <CardDescription>Approximate annual tuition (INR)</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <p className="font-heading text-2xl font-semibold tabular-nums">
              {formatFees(course.feesMinInr, course.feesMaxInr)}
            </p>
            <DetailRow label="Duration">
              <span className="tabular-nums">{course.tenureYears}</span> year
              {course.tenureYears === "1" ? "" : "s"}
            </DetailRow>
          </CardContent>
        </Card>
      </div>

      {/* Institutes */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Building2 className="size-5 text-primary" aria-hidden />
            Where it&apos;s offered
            <span className="text-sm font-normal tabular-nums text-muted-foreground">
              ({linkedInstitutes.length})
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {linkedInstitutes.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              We&apos;re still adding institutes for this course. Check back soon.
            </p>
          ) : (
            <ul className="flex flex-col divide-y rounded-lg border">
              {linkedInstitutes.map((i) => (
                <li key={i.id} className="flex items-center justify-between gap-3 p-3">
                  <div className="flex min-w-0 flex-col gap-0.5">
                    <span className="truncate text-sm font-medium">{i.name}</span>
                    <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                      <MapPin className="size-3" aria-hidden />
                      {i.city}, {i.state} · {i.instituteType}
                    </span>
                  </div>
                  {i.websiteUrl ? (
                    <Button asChild variant="ghost" size="sm" className="shrink-0">
                      <a href={i.websiteUrl} target="_blank" rel="noreferrer">
                        Visit
                        <ExternalLink data-icon="inline-end" />
                      </a>
                    </Button>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* Learn this course */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <BookOpen className="size-5 text-primary" aria-hidden />
            Learn This Course
          </CardTitle>
          <CardDescription>
            Free and beginner-friendly resources selected for this course.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {learningResources.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Learning resources for this course will be added soon.
            </p>
          ) : (
            <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
              {learningResources.map((resource) => (
                <article
                  key={resource.id}
                  className="flex min-w-0 flex-col overflow-hidden rounded-lg border bg-background"
                >
                  {resource.thumbnailUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element -- Admin-reviewed external thumbnails can come from multiple providers.
                    <img
                      src={resource.thumbnailUrl}
                      alt=""
                      className="aspect-video w-full bg-muted object-cover"
                      loading="lazy"
                    />
                  ) : null}
                  <div className="flex flex-1 flex-col gap-3 p-4">
                    <div className="flex flex-col gap-2">
                      <div className="flex flex-wrap gap-1.5">
                        <Badge variant="secondary" className="font-normal">
                          {resource.platform}
                        </Badge>
                        <Badge variant="outline" className="font-normal">
                          {resource.resourceType}
                        </Badge>
                        <Badge variant="outline" className="font-normal">
                          {resource.difficulty}
                        </Badge>
                        <Badge variant="outline" className="font-normal">
                          {resource.language}
                        </Badge>
                        {!resource.isFree ? (
                          <Badge variant="destructive" className="font-normal">
                            Paid
                          </Badge>
                        ) : null}
                      </div>
                      <h2 className="font-heading text-base font-semibold leading-snug">
                        {resource.title}
                      </h2>
                    </div>
                    <p className="text-sm leading-relaxed text-muted-foreground">
                      {resource.description}
                    </p>
                    <Button asChild size="sm" className="mt-auto self-start">
                      <a href={resource.url} target="_blank" rel="noopener noreferrer">
                        Start Learning
                        <ExternalLink data-icon="inline-end" />
                      </a>
                    </Button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Q&A — prominent */}
      <Card className="border-primary/30 bg-primary/[0.03]">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <MessagesSquare className="size-5 text-primary" aria-hidden />
            Ask about this course
          </CardTitle>
          <CardDescription>
            Curious about jobs, daily life, or what comes after? Ask anything — answers are about
            this course only.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <QAChat courseId={course.id} courseName={course.courseName} />
        </CardContent>
      </Card>

      {/* Sources */}
      {course.sourceUrls.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <ScrollText className="size-4 text-muted-foreground" aria-hidden />
              Sources
            </CardTitle>
            <CardDescription>Where this information comes from.</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="flex flex-col gap-2">
              {course.sourceUrls.map((u: string) => (
                <li key={u}>
                  <a
                    href={u}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-start gap-1.5 text-xs text-muted-foreground underline-offset-4 hover:text-primary hover:underline"
                  >
                    <Link2 className="mt-0.5 size-3 shrink-0" aria-hidden />
                    <span className="break-all">{u}</span>
                  </a>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      ) : null}

      {/* Related */}
      {related.length > 0 ? (
        <section className="flex flex-col gap-3">
          <h2 className="font-heading text-lg font-semibold tracking-tight">Related courses</h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {related.map((r) => (
              <Link
                key={r.id}
                href={`/courses/${r.slug}`}
                className="group flex items-center justify-between gap-2 rounded-lg border bg-card p-3.5 shadow-sm transition-[transform,box-shadow,border-color] duration-200 ease-out hover:-translate-y-0.5 hover:border-primary/50 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 motion-reduce:transition-none motion-reduce:hover:translate-y-0"
              >
                <div className="flex min-w-0 flex-col gap-1.5">
                  <span className="truncate font-heading text-sm font-semibold">
                    {r.courseName}
                  </span>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <Badge variant="secondary" className="font-normal">
                      {STREAM_LABEL[r.stream] ?? r.stream}
                    </Badge>
                    <AiSafetyBadge tag={r.aiSafetyTag} />
                  </div>
                </div>
                <ExternalLink
                  className="size-4 shrink-0 text-muted-foreground transition-colors group-hover:text-primary"
                  aria-hidden
                />
              </Link>
            ))}
          </div>
        </section>
      ) : null}
    </article>
  );
}

function DetailRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
      <div className="text-sm text-foreground/90">{children}</div>
    </div>
  );
}

function formatFees(min: string | null, max: string | null): string {
  if (!min && !max) return "Not specified";
  const fmt = (s: string) => `₹${Number(s).toLocaleString("en-IN")}`;
  if (min && max && min !== max) return `${fmt(min)} – ${fmt(max)}`;
  return fmt(min ?? max!);
}
