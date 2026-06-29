import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { ManualCourseForm } from "@/components/admin/manual-course-form";
import { AdminPageHeader } from "@/components/admin/shell/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export const dynamic = "force-dynamic";

export default function ManualCourseCreatePage() {
  return (
    <div className="flex flex-col gap-6">
      <AdminPageHeader
        title="Add course manually"
        description={
          <>
            Saved as <code>pending_review</code>. Publish from the review queue once it is ready.
          </>
        }
        actions={
          <Button asChild variant="outline">
            <Link href="/admin/review">
              <ArrowLeft aria-hidden />
              Review queue
            </Link>
          </Button>
        }
      />
      <Card>
        <CardContent className="pt-6">
          <ManualCourseForm />
        </CardContent>
      </Card>
    </div>
  );
}
