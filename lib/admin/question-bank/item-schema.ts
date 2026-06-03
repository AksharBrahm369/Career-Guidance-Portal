import { z } from "zod";

const Option = z.object({ id: z.string().min(1), text: z.string().min(1) });

const Common = z.object({
  dimension: z.string().min(1),
  questionText: z.string().min(1),
  options: z.array(Option).min(2),
  source: z.string().min(1),
  license: z.string().optional(),
  version: z.number().int().positive().default(1),
  poolGroup: z.string().optional(),
  media: z.object({ stem: z.string().optional(), options: z.record(z.string()).optional() }).optional(),
});

const AptitudeBase = Common.extend({
  module: z.literal("aptitude"),
  correctOptionId: z.string().min(1),
});

const Aptitude = AptitudeBase.superRefine((i, ctx) => {
  if (!i.options.some((o) => o.id === i.correctOptionId)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "correctOptionId must match one of the option ids",
      path: ["correctOptionId"],
    });
  }
});

const SelfReport = Common.extend({
  module: z.enum(["interests", "work_style"]),
  scoringMap: z.record(z.record(z.number())),
});

export const ImportItem = z.union([Aptitude, SelfReport]);
export type ImportItem = z.infer<typeof ImportItem>;
