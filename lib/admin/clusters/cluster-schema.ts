import { z } from "zod";

const WeightMap = z.record(z.number().min(0).max(1));

export const ClusterDefinition = z.object({
  key: z.string().min(1).regex(/^[a-z0-9-]+$/, "key must be kebab-case"),
  name: z.string().min(1),
  description: z.string().optional(),
  targetProfile: z.object({
    interests: WeightMap,
    aptitude: WeightMap,
    workStyle: WeightMap,
  }),
  lensWeights: z
    .object({
      interests: z.number().min(0).max(1),
      aptitude: z.number().min(0).max(1),
      marks: z.number().min(0).max(1),
      workStyle: z.number().min(0).max(1),
    })
    .refine((w) => Math.abs(w.interests + w.aptitude + w.marks + w.workStyle - 1) < 0.001, {
      message: "lens weights must sum to 1",
    }),
});

export type ClusterDefinition = z.infer<typeof ClusterDefinition>;
