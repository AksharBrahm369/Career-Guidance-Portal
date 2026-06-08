import { FetchManager } from "@/components/admin/fetch-manager";
import { AdminPageHeader } from "@/components/admin/shell/page-header";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardContent } from "@/components/ui/card";

export const dynamic = "force-dynamic";

export default function AdminFetchPage() {
  return (
    <div className="flex flex-col gap-6">
      <AdminPageHeader
        title="Fetch courses"
        description="Run an AI fetch to populate the review queue with new courses."
      />

      <Alert>
        <AlertTitle>How fetching works</AlertTitle>
        <AlertDescription>
          AI automatically fetches all relevant variations for a query (minimum 5 if
          available) and saves each as pending review. Existing published and pending courses
          are excluded automatically — use override to bypass.
        </AlertDescription>
      </Alert>

      <Card>
        <CardContent className="pt-6">
          <FetchManager />
        </CardContent>
      </Card>
    </div>
  );
}
