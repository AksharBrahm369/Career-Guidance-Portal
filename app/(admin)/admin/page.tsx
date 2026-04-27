import Link from "next/link";
import { desc, eq, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { auditLog, courses } from "@/db/schema";

export const dynamic = "force-dynamic";

async function getStats() {
  const countsRes = await db.execute<{
    published: number;
    pending: number;
    rejected: number;
    archived: number;
  }>(sql`
    select
      count(*) filter (where status = 'published')::int as published,
      count(*) filter (where status = 'pending_review')::int as pending,
      count(*) filter (where status = 'rejected')::int as rejected,
      count(*) filter (where status = 'archived')::int as archived
    from ${courses}
  `);
  const counts = countsRes.rows[0];

  const [lastFetch] = await db
    .select()
    .from(auditLog)
    .where(eq(auditLog.action, "ai_fetch"))
    .orderBy(desc(auditLog.createdAt))
    .limit(1);

  const clusterRes = await db.execute<{ clusters: number }>(sql`
    select count(distinct cluster)::int as clusters
    from ${courses}, lateral unnest(career_clusters) as cluster
    where status = 'published'
  `);

  return {
    published: counts?.published ?? 0,
    pending: counts?.pending ?? 0,
    rejected: counts?.rejected ?? 0,
    archived: counts?.archived ?? 0,
    clusters: clusterRes.rows[0]?.clusters ?? 0,
    lastFetchAt: lastFetch?.createdAt ?? null,
  };
}

function StatCard({
  label,
  value,
  accent,
}: {
  label: string;
  value: React.ReactNode;
  accent?: boolean;
}) {
  return (
    <div
      className={`rounded-lg border p-4 ${
        accent ? "border-destructive/50 bg-destructive/5" : "bg-card"
      }`}
    >
      <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="mt-1 text-2xl font-semibold">{value}</div>
    </div>
  );
}

export default async function AdminDashboardPage() {
  const stats = await getStats();
  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <div className="flex gap-2 text-sm">
          <Link
            href="/admin/fetch"
            className="rounded-md bg-primary px-3 py-1.5 text-primary-foreground"
          >
            New AI Fetch
          </Link>
          <Link href="/admin/review" className="rounded-md border px-3 py-1.5">
            Review Queue {stats.pending > 0 ? `(${stats.pending})` : ""}
          </Link>
          <Link href="/admin/catalogue" className="rounded-md border px-3 py-1.5">
            Catalogue
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Published" value={stats.published} />
        <StatCard label="Pending review" value={stats.pending} accent={stats.pending > 0} />
        <StatCard label="Rejected" value={stats.rejected} />
        <StatCard label="Archived" value={stats.archived} />
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <StatCard label="Career clusters covered" value={stats.clusters} />
        <StatCard
          label="Last AI fetch"
          value={stats.lastFetchAt ? new Date(stats.lastFetchAt).toLocaleString() : "—"}
        />
      </div>
    </div>
  );
}
