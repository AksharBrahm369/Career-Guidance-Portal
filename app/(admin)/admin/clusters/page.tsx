import { db } from "@/lib/db";
import { careerClusters } from "@/db/schema";
import { ClusterForm } from "@/components/admin/cluster-form";
import { AdminPageHeader } from "@/components/admin/shell/page-header";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export const dynamic = "force-dynamic";

export default async function ClustersPage() {
  const clusters = await db.select().from(careerClusters).orderBy(careerClusters.name);
  return (
    <div className="flex flex-col gap-6">
      <AdminPageHeader
        title="Career clusters"
        description="Configure career clusters and the lens weighting used by the profiling engine."
      />

      <Card>
        <CardHeader>
          <CardTitle>Add cluster</CardTitle>
          <CardDescription>
            Define a new career cluster and its lens weighting as JSON.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ClusterForm />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>All clusters</CardTitle>
          <CardDescription>
            {clusters.length} {clusters.length === 1 ? "cluster" : "clusters"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {clusters.length === 0 ? (
            <Alert>
              <AlertTitle>No clusters yet</AlertTitle>
              <AlertDescription>
                Add your first career cluster using the button above.
              </AlertDescription>
            </Alert>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Key</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Lens weights</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {clusters.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">{c.name}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{c.key}</Badge>
                    </TableCell>
                    <TableCell>
                      {c.active ? (
                        <Badge variant="secondary">Active</Badge>
                      ) : (
                        <Badge variant="outline">Inactive</Badge>
                      )}
                    </TableCell>
                    <TableCell className="max-w-xs">
                      <code className="block truncate text-xs text-muted-foreground">
                        {JSON.stringify(c.lensWeights)}
                      </code>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
