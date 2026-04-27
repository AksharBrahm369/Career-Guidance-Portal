import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { courses } from "@/db/schema";
import { ArchiveButton } from "@/components/admin/archive-button";

export const dynamic = "force-dynamic";

export default async function AdminCataloguePage() {
  const rows = await db
    .select()
    .from(courses)
    .where(eq(courses.status, "published"))
    .orderBy(desc(courses.publishedAt))
    .limit(100);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Published Catalogue</h1>
          <p className="text-sm text-muted-foreground">
            {rows.length} course{rows.length === 1 ? "" : "s"} live.
          </p>
        </div>
        <Link href="/admin" className="text-sm underline">
          ← Dashboard
        </Link>
      </div>

      {rows.length === 0 ? (
        <div className="rounded-md border bg-card p-8 text-center text-sm text-muted-foreground">
          No published courses yet. Fetch one with AI or add manually.
        </div>
      ) : (
        <div className="overflow-hidden rounded-md border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-3 py-2">Course</th>
                <th className="px-3 py-2">Stream</th>
                <th className="px-3 py-2">AI Safety</th>
                <th className="px-3 py-2">Published</th>
                <th className="px-3 py-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {rows.map((c) => (
                <tr key={c.id}>
                  <td className="px-3 py-2 font-medium">{c.courseName}</td>
                  <td className="px-3 py-2">{c.stream}</td>
                  <td className="px-3 py-2">{c.aiSafetyTag}</td>
                  <td className="px-3 py-2 text-xs text-muted-foreground">
                    {c.publishedAt ? new Date(c.publishedAt).toLocaleDateString() : "—"}
                  </td>
                  <td className="px-3 py-2 text-right">
                    <ArchiveButton courseId={c.id} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
