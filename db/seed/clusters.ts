import type { ClusterDefinition } from "@/lib/admin/clusters/cluster-schema";

export const STARTER_CLUSTERS: ClusterDefinition[] = [
  {
    key: "engineering-technology",
    name: "Engineering & Technology",
    targetProfile: { interests: { I: 0.9, R: 0.7 }, aptitude: { numerical: 0.8, spatial: 0.7, logical: 0.8 }, workStyle: { Analytical: 0.8, Structured: 0.6 } },
    lensWeights: { interests: 0.3, aptitude: 0.3, marks: 0.3, workStyle: 0.1 },
  },
  {
    key: "healthcare-life-sciences",
    name: "Healthcare & Life Sciences",
    targetProfile: { interests: { I: 0.9, S: 0.6 }, aptitude: { verbal: 0.6, logical: 0.7 }, workStyle: { PeopleOriented: 0.6, Structured: 0.7 } },
    lensWeights: { interests: 0.3, aptitude: 0.25, marks: 0.35, workStyle: 0.1 },
  },
  {
    key: "commerce-management",
    name: "Commerce & Management",
    targetProfile: { interests: { E: 0.8, C: 0.7 }, aptitude: { numerical: 0.7, verbal: 0.6 }, workStyle: { PeopleOriented: 0.6, Structured: 0.6 } },
    lensWeights: { interests: 0.35, aptitude: 0.2, marks: 0.3, workStyle: 0.15 },
  },
];
