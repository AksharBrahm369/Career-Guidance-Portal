import Link from "next/link";
import { CourseLifecycleActions } from "@/components/admin/course-lifecycle-actions";
import { LearningResourcesManager } from "@/components/admin/learning-resources-manager";
import { Pagination } from "@/components/pagination";
import { AdminPageHeader } from "@/components/admin/shell/page-header";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ADMIN_STATUSES, listAdminCourses, type AdminStatus } from "@/lib/admin/courses-list";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

const TAB_LABELS: Record<AdminStatus, string> = {
  published: "Published",
  pending_review: "Pending review",
  rejected: "Rejected",
  archived: "Archived",
};

const SAFETY_LABELS: Record<string, string> = {
  ai_safe: "AI safe",
  ai_augmented: "AI augmented",
  ai_risk: "AI risk",
};

function safetyVariant(tag: string): "secondary" | "outline" | "destructive" {
  if (tag === "ai_risk") return "destructive";
  if (tag === "ai_augmented") return "outline";
  return "secondary";
}

interface PageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

function pickStatus(v: unknown): AdminStatus {
  return typeof v === "string" && (ADMIN_STATUSES as readonly string[]).includes(v)
    ? (v as AdminStatus)
    : "published";
}

export default async function AdminCataloguePage({ searchParams }: PageProps) {
  const sp = await searchParams;
  const status = pickStatus(sp.status);
  const page = typeof sp.page === "string" ? Number(sp.page) || 1 : 1;
  const data = await listAdminCourses({ status, page });

  const hrefForPage = (target: number) => {
    const out = new URLSearchParams();
    if (status !== "published") out.set("status", status);
    if (target > 1) out.set("page", String(target));
    const s = out.toString();
    return `/admin/catalogue${s ? `?${s}` : ""}`;
  };

  return (
    <div className="flex flex-col gap-6">
      <AdminPageHeader
        title="Courses"
        description={`${data.total} ${TAB_LABELS[status].toLowerCase()} course${
          data.total === 1 ? "" : "s"
        }.`}
      />

      <div role="tablist" className="flex flex-wrap gap-1.5">
        {ADMIN_STATUSES.map((s) => {
          const active = s === status;
          const href = s === "published" ? "/admin/catalogue" : `/admin/catalogue?status=${s}`;
          return (
            <Link
              key={s}
              role="tab"
              aria-selected={active}
              href={href}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                active
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-input bg-background hover:bg-muted",
              )}
            >
              {TAB_LABELS[s]}
              <span className={active ? "opacity-80" : "text-muted-foreground"}>
                {data.counts[s]}
              </span>
            </Link>
          );
        })}
      </div>

      {data.rows.length === 0 ? (
        <Alert>
          <AlertTitle>No courses</AlertTitle>
          <AlertDescription>
            No {TAB_LABELS[status].toLowerCase()} courses to show.
          </AlertDescription>
        </Alert>
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Course</TableHead>
                  <TableHead>Stream</TableHead>
                  <TableHead>AI safety</TableHead>
                  <TableHead>{dateLabel(status)}</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.rows.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">
                      {c.courseName}
                      {status === "rejected" && c.rejectionReason ? (
                        <div className="mt-0.5 line-clamp-2 max-w-md text-xs font-normal text-destructive">
                          {c.rejectionReason}
                        </div>
                      ) : null}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{c.stream}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={safetyVariant(c.aiSafetyTag)}>
                        {SAFETY_LABELS[c.aiSafetyTag] ?? c.aiSafetyTag}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {formatDate(dateForStatus(status, c))}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex flex-wrap justify-end gap-1.5">
                        <LearningResourcesManager courseId={c.id} courseName={c.courseName} />
                        <CourseLifecycleActions courseId={c.id} status={status} />
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <Pagination page={data.page} pageCount={data.pageCount} hrefForPage={hrefForPage} />
    </div>
  );
}

function dateLabel(status: AdminStatus): string {
  switch (status) {
    case "published":
      return "Published";
    case "pending_review":
      return "Submitted";
    case "rejected":
      return "Rejected";
    case "archived":
      return "Archived";
  }
}

function dateForStatus(
  status: AdminStatus,
  c: { publishedAt: Date | null; createdAt: Date; updatedAt: Date },
): Date | null {
  switch (status) {
    case "published":
      return c.publishedAt;
    case "pending_review":
      return c.createdAt;
    case "rejected":
    case "archived":
      return c.updatedAt;
  }
}

function formatDate(d: Date | null): string {
  if (!d) return "—";
  return new Date(d).toLocaleDateString();
}
