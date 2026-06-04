import { db } from "@/lib/db";
import { careerClusters } from "@/db/schema";
import { ClusterForm } from "@/components/admin/cluster-form";

export const dynamic = "force-dynamic";

export default async function ClustersPage() {
  const clusters = await db.select().from(careerClusters).orderBy(careerClusters.name);
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold">Career Clusters</h1>
      <ClusterForm />
      <ul className="divide-y rounded-md border">
        {clusters.map((c) => (
          <li key={c.id} className="p-3 text-sm">
            <span className="font-medium">{c.name}</span>{" "}
            <span className="text-muted-foreground">({c.key})</span>
            {!c.active && <span className="ml-1 text-muted-foreground">· inactive</span>}
            <pre className="mt-1 overflow-x-auto text-xs text-muted-foreground">
              weights: {JSON.stringify(c.lensWeights)}
            </pre>
          </li>
        ))}
      </ul>
    </div>
  );
}
