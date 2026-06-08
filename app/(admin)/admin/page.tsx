import Link from "next/link";
import {
  BookOpen,
  Boxes,
  ClipboardCheck,
  DownloadCloud,
  ListChecks,
  Users,
  type LucideIcon,
} from "lucide-react";
import { count, desc, eq, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { auditLog, courses, questionBank, user } from "@/db/schema";
import { AdminPageHeader } from "@/components/admin/shell/page-header";
import { StatCard } from "@/components/admin/shell/stat-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export const dynamic = "force-dynamic";

async function getStats() {
  const [courseCountsRes, clusterRes, studentRes, questionRes, lastFetch] =
    await Promise.all([
      db.execute<{
        published: number;
        pending: number;
        rejected: number;
        archived: number;
        clusters: number;
      }>(sql`
        select
          count(*) filter (where status = 'published')::int as published,
          count(*) filter (where status = 'pending_review')::int as pending,
          count(*) filter (where status = 'rejected')::int as rejected,
          count(*) filter (where status = 'archived')::int as archived
        from ${courses}
      `),
      db.execute<{ clusters: number }>(sql`
        select count(distinct cluster)::int as clusters
        from ${courses}, lateral unnest(career_clusters) as cluster
        where status = 'published'
      `),
      db.select({ value: count() }).from(user).where(eq(user.role, "student")),
      db.select({ value: count() }).from(questionBank),
      db
        .select({ createdAt: auditLog.createdAt })
        .from(auditLog)
        .where(eq(auditLog.action, "ai_fetch"))
        .orderBy(desc(auditLog.createdAt))
        .limit(1),
    ]);

  const c = courseCountsRes.rows[0];
  return {
    published: c?.published ?? 0,
    pending: c?.pending ?? 0,
    rejected: c?.rejected ?? 0,
    archived: c?.archived ?? 0,
    clusters: clusterRes.rows[0]?.clusters ?? 0,
    students: studentRes[0]?.value ?? 0,
    questions: questionRes[0]?.value ?? 0,
    lastFetchAt: lastFetch[0]?.createdAt ?? null,
  };
}

interface Section {
  title: string;
  description: string;
  href: string;
  icon: LucideIcon;
  count: number;
  countLabel: string;
}

export default async function AdminDashboardPage() {
  const stats = await getStats();

  const sections: Section[] = [
    {
      title: "Review queue",
      description: "Approve or reject AI-fetched courses awaiting human review.",
      href: "/admin/review",
      icon: ClipboardCheck,
      count: stats.pending,
      countLabel: "pending",
    },
    {
      title: "Fetch courses",
      description: "Run an AI fetch to populate the review queue with new courses.",
      href: "/admin/fetch",
      icon: DownloadCloud,
      count: stats.published + stats.pending,
      countLabel: "total fetched",
    },
    {
      title: "Catalogue",
      description: "Browse and manage the lifecycle of every course in the system.",
      href: "/admin/catalogue",
      icon: BookOpen,
      count: stats.published,
      countLabel: "published",
    },
    {
      title: "Students",
      description: "View registered students and their assessment progress.",
      href: "/admin/students",
      icon: Users,
      count: stats.students,
      countLabel: "registered",
    },
    {
      title: "Question Bank",
      description: "Manage the assessment items used by the profiling engine.",
      href: "/admin/question-bank",
      icon: ListChecks,
      count: stats.questions,
      countLabel: "items",
    },
    {
      title: "Clusters",
      description: "Configure career clusters and their lens weighting.",
      href: "/admin/clusters",
      icon: Boxes,
      count: stats.clusters,
      countLabel: "covered",
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <AdminPageHeader
        title="Dashboard"
        description="Overview of the catalogue, students and profiling engine."
        actions={
          <Button asChild>
            <Link href="/admin/fetch">
              <DownloadCloud data-icon="inline-start" />
              New AI fetch
            </Link>
          </Button>
        }
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          label="Pending review"
          value={stats.pending}
          icon={ClipboardCheck}
          hint={stats.pending > 0 ? "Needs attention" : "All clear"}
        />
        <StatCard
          label="Published courses"
          value={stats.published}
          icon={BookOpen}
          hint={`${stats.clusters} clusters covered`}
        />
        <StatCard label="Students" value={stats.students} icon={Users} hint="Registered" />
        <StatCard
          label="Question bank"
          value={stats.questions}
          icon={ListChecks}
          hint="Assessment items"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {sections.map((section) => (
          <Card key={section.href} className="flex flex-col">
            <CardHeader>
              <div className="flex items-center justify-between gap-2">
                <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <section.icon className="size-5" aria-hidden />
                </div>
                <Badge variant="secondary">
                  {section.count} {section.countLabel}
                </Badge>
              </div>
              <CardTitle className="pt-2">{section.title}</CardTitle>
              <CardDescription>{section.description}</CardDescription>
            </CardHeader>
            <CardFooter className="mt-auto">
              <Button asChild variant="outline" size="sm">
                <Link href={section.href}>Open</Link>
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Catalogue health</CardTitle>
          <CardDescription>Distribution of courses across the lifecycle.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary">{stats.published} published</Badge>
          <Badge variant={stats.pending > 0 ? "default" : "secondary"}>
            {stats.pending} pending review
          </Badge>
          <Badge variant="outline">{stats.rejected} rejected</Badge>
          <Badge variant="outline">{stats.archived} archived</Badge>
          <span className="ml-auto text-xs text-muted-foreground">
            Last AI fetch:{" "}
            {stats.lastFetchAt ? new Date(stats.lastFetchAt).toLocaleString() : "—"}
          </span>
        </CardContent>
      </Card>
    </div>
  );
}
