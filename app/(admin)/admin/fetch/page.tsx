import Link from "next/link";
import { FetchManager } from "@/components/admin/fetch-manager";

export const dynamic = "force-dynamic";

export default function AdminFetchPage() {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Fetch Manager</h1>
        <Link href="/admin" className="text-sm underline">
          ← Dashboard
        </Link>
      </div>
      <p className="text-sm text-muted-foreground">
        AI fetches a single course per call and saves it as <code>pending_review</code>. Existing
        published &amp; pending courses are excluded automatically (use override to bypass).
      </p>
      <FetchManager />
    </div>
  );
}
