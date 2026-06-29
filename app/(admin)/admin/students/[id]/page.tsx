import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeftIcon,
  BrainIcon,
  CalendarIcon,
  GraduationCapIcon,
  PhoneIcon,
  UserIcon,
} from "lucide-react";
import { and, desc, eq } from "drizzle-orm";
import { requireAdmin } from "@/lib/auth/require-admin";
import { dimensionMaxScores } from "@/lib/assessment/display";
import { getActiveItems } from "@/lib/assessment/items";
import { db } from "@/lib/db";
import { assessments, user } from "@/db/schema";
import { getAssessmentRecommendationView } from "@/lib/recommendation/assessment";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CapturedProfile } from "@/components/student/assessment/captured-profile";
import { StudentActions } from "@/components/admin/students/student-actions";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function formatDate(d: Date | null) {
  if (!d) return "—";
  return d.toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDay(d: Date | null) {
  if (!d) return "—";
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

function initials(name: string | null) {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return (parts[0]![0]! + parts[parts.length - 1]![0]!).toUpperCase();
}

function Field({
  label,
  icon: Icon,
  children,
}: {
  label: string;
  icon?: typeof UserIcon;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1">
      <dt className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {Icon ? <Icon className="size-3.5" aria-hidden /> : null}
        {label}
      </dt>
      <dd className="text-sm">{children}</dd>
    </div>
  );
}

export default async function StudentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  // Auth doesn't gate which row we read (that's keyed on the route id), so run
  // the getSession round-trip alongside the data queries, then await auth first.
  const authPromise = requireAdmin();
  const { id } = await params;

  const dataPromise = Promise.all([
    db.query.user.findFirst({
      where: and(eq(user.id, id), eq(user.role, "student")),
    }),
    db.query.assessments.findFirst({
      where: and(eq(assessments.studentId, id), eq(assessments.status, "completed")),
      orderBy: desc(assessments.completedAt),
    }),
    getActiveItems("interests"),
    getActiveItems("work_style"),
  ]);

  await authPromise;
  const [student, latestAssessment, interestItems, workStyleItems] = await dataPromise;

  if (!student) notFound();
  const recommendationView = latestAssessment
    ? await getAssessmentRecommendationView(latestAssessment)
    : null;

  return (
    <div className="flex flex-col gap-6">
      <Button variant="ghost" size="sm" asChild className="self-start text-muted-foreground">
        <Link href="/admin/students">
          <ArrowLeftIcon />
          Back to students
        </Link>
      </Button>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <Avatar className="size-14">
                <AvatarFallback className="text-lg font-medium">
                  {initials(student.name)}
                </AvatarFallback>
              </Avatar>
              <div className="flex flex-col gap-1">
                <div className="flex flex-wrap items-center gap-2">
                  <CardTitle className="text-xl">{student.name}</CardTitle>
                  {student.banned ? (
                    <Badge variant="destructive">Banned</Badge>
                  ) : (
                    <Badge variant="secondary">Active</Badge>
                  )}
                </div>
                <CardDescription className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  <span className="flex items-center gap-1 tabular-nums">
                    <PhoneIcon className="size-3.5" aria-hidden />
                    {student.phoneNumber ?? "—"}
                  </span>
                  <span className="flex items-center gap-1">
                    <GraduationCapIcon className="size-3.5" aria-hidden />
                    {student.grade != null ? `Grade ${student.grade}` : "No grade"}
                  </span>
                  <span className="flex items-center gap-1">
                    <CalendarIcon className="size-3.5" aria-hidden />
                    Joined {formatDay(student.createdAt)}
                  </span>
                </CardDescription>
              </div>
            </div>
          </div>
        </CardHeader>
      </Card>

      <Tabs defaultValue="profile" className="flex flex-col gap-4">
        <TabsList>
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="account">Account</TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="mt-0">
          {latestAssessment ? (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BrainIcon className="size-5 text-muted-foreground" aria-hidden />
                  Brain Profile
                </CardTitle>
                <CardDescription>
                  From the latest completed assessment ({formatDate(latestAssessment.completedAt)}
                  ).
                </CardDescription>
              </CardHeader>
              <CardContent>
                <CapturedProfile
                  interestData={latestAssessment.interestData ?? {}}
                  workStyleScores={latestAssessment.workStyleScores ?? {}}
                  aptitudeScores={latestAssessment.aptitudeScores ?? {}}
                  subjectAffinities={latestAssessment.subjectAffinities ?? {}}
                  marks={latestAssessment.marks ?? null}
                  confidence={recommendationView?.confidence ?? null}
                  clusterScores={recommendationView?.clusterScores ?? []}
                  recommendedCourses={recommendationView?.recommendedCourses ?? []}
                  lowSignal={recommendationView?.lowSignal ?? true}
                  interestMaxScores={dimensionMaxScores(interestItems)}
                  workStyleMaxScores={dimensionMaxScores(workStyleItems)}
                />
              </CardContent>
            </Card>
          ) : (
            <Alert>
              <BrainIcon className="size-4" />
              <AlertTitle>No assessment completed yet</AlertTitle>
              <AlertDescription>
                This student has not completed an assessment, so there is no Brain Profile to show.
              </AlertDescription>
            </Alert>
          )}
        </TabsContent>

        <TabsContent value="account" className="mt-0">
          <Card>
            <CardHeader>
              <CardTitle>Account</CardTitle>
              <CardDescription>Student account details and management actions.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-6">
              <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <Field label="Name" icon={UserIcon}>
                  {student.name}
                </Field>
                <Field label="Phone" icon={PhoneIcon}>
                  <span className="tabular-nums">{student.phoneNumber ?? "—"}</span>
                </Field>
                <Field label="Grade" icon={GraduationCapIcon}>
                  {student.grade != null ? `Grade ${student.grade}` : "—"}
                </Field>
                <Field label="Phone verified">
                  {student.phoneNumberVerified ? (
                    <Badge variant="secondary">Yes</Badge>
                  ) : (
                    <Badge variant="outline" className="text-muted-foreground">
                      No
                    </Badge>
                  )}
                </Field>
                <Field label="Last assessment">{formatDate(student.lastAssessmentAt)}</Field>
                <Field label="Cooldown override">
                  {student.cooldownOverride ? (
                    <Badge variant="secondary">On</Badge>
                  ) : (
                    <Badge variant="outline" className="text-muted-foreground">
                      Off
                    </Badge>
                  )}
                </Field>
                <Field label="Joined" icon={CalendarIcon}>
                  {formatDate(student.createdAt)}
                </Field>
                {student.banned ? (
                  <Field label="Ban reason">{student.banReason ?? "—"}</Field>
                ) : null}
              </dl>
              <Separator />
              <div className="flex flex-col gap-2">
                <h3 className="text-sm font-medium">Manage student</h3>
                <StudentActions studentId={student.id} banned={Boolean(student.banned)} />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
