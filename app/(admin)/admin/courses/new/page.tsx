import Link from "next/link";
import { ManualCourseForm } from "@/components/admin/manual-course-form";

export const dynamic = "force-dynamic";

export default function ManualCourseCreatePage() {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Add course manually</h1>
        <Link href="/admin/review" className="text-sm underline">
          ← Review Queue
        </Link>
      </div>
      <p className="text-sm text-muted-foreground">
        Saved as <code>pending_review</code>. Publish from the queue once it&apos;s ready.
      </p>
      <ManualCourseForm />
    </div>
  );
}
