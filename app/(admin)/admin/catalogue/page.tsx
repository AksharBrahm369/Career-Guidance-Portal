import Link from "next/link";
import { CourseLifecycleActions } from "@/components/admin/course-lifecycle-actions";
import { Pagination } from "@/components/pagination";
import {
  ADMIN_STATUSES,
  listAdminCourses,
  type AdminStatus,
} from "@/lib/admin/courses-list";

export const dynamic = "force-dynamic";

const TAB_LABELS: Record<AdminStatus, string> = {
  published: "Published",
  pending_review: "Pending review",
  rejected: "Rejected",
  archived: "Archived",
};

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
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Courses</h1>
          <p className="text-sm text-muted-foreground">
            {data.total} {TAB_LABELS[status].toLowerCase()} course{data.total === 1 ? "" : "s"}.
          </p>
        </div>
        <Link href="/admin" className="text-sm underline">
          ← Dashboard
        </Link>
      </div>

      <div role="tablist" className="flex flex-wrap gap-1.5 text-xs">
        {ADMIN_STATUSES.map((s) => {
          const active = s === status;
          const href = s === "published" ? "/admin/catalogue" : `/admin/catalogue?status=${s}`;
          return (
            <Link
              key={s}
              role="tab"
              aria-selected={active}
              href={href}
              className={`rounded-full border px-3 py-1.5 transition ${
                active
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-input bg-background hover:bg-muted"
              }`}
            >
              {TAB_LABELS[s]}{" "}
              <span className={active ? "opacity-80" : "text-muted-foreground"}>
                ({data.counts[s]})
              </span>
            </Link>
          );
        })}
      </div>

      {data.rows.length === 0 ? (
        <div className="rounded-md border bg-card p-8 text-center text-sm text-muted-foreground">
          No {TAB_LABELS[status].toLowerCase()} courses.
        </div>
      ) : (
        <div className="overflow-hidden rounded-md border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-3 py-2">Course</th>
                <th className="px-3 py-2">Stream</th>
                <th className="px-3 py-2">AI Safety</th>
                <th className="px-3 py-2">{dateLabel(status)}</th>
                <th className="px-3 py-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {data.rows.map((c) => (
                <tr key={c.id}>
                  <td className="px-3 py-2 font-medium">
                    {c.courseName}
                    {status === "rejected" && c.rejectionReason ? (
                      <div className="mt-0.5 line-clamp-2 max-w-md text-xs font-normal text-destructive">
                        {c.rejectionReason}
                      </div>
                    ) : null}
                  </td>
                  <td className="px-3 py-2">{c.stream}</td>
                  <td className="px-3 py-2">{c.aiSafetyTag}</td>
                  <td className="px-3 py-2 text-xs text-muted-foreground">
                    {formatDate(dateForStatus(status, c))}
                  </td>
                  <td className="px-3 py-2 text-right">
                    <CourseLifecycleActions courseId={c.id} status={status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
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
