import { z } from "zod";

const ProviderId = z.enum(["anthropic", "google", "openai"]);

const EnvSchema = z
  .object({
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
    DATABASE_URL: z.string().url(),

    // AI provider selection — global default, with optional per-feature overrides.
    AI_PROVIDER: ProviderId.default("anthropic"),
    AI_FETCH_PROVIDER: ProviderId.optional(),
    AI_QA_PROVIDER: ProviderId.optional(),

    // Provider keys — only the configured one is required at runtime.
    ANTHROPIC_API_KEY: z.string().optional(),
    GOOGLE_GENERATIVE_AI_API_KEY: z.string().optional(),
    OPENAI_API_KEY: z.string().optional(),

    BETTER_AUTH_SECRET: z.string().min(32, "BETTER_AUTH_SECRET must be at least 32 chars"),
    BETTER_AUTH_URL: z.string().url().default("http://localhost:3000"),
  })
  .refine((env) => Boolean(providerKey(env, env.AI_PROVIDER)), {
    message:
      "Default AI_PROVIDER set but its API key is missing. Set ANTHROPIC_API_KEY, GOOGLE_GENERATIVE_AI_API_KEY, or OPENAI_API_KEY to match.",
    path: ["AI_PROVIDER"],
  });

function providerKey(
  env: { ANTHROPIC_API_KEY?: string; GOOGLE_GENERATIVE_AI_API_KEY?: string; OPENAI_API_KEY?: string },
  id: z.infer<typeof ProviderId>,
): string | undefined {
  switch (id) {
    case "anthropic":
      return env.ANTHROPIC_API_KEY;
    case "google":
      return env.GOOGLE_GENERATIVE_AI_API_KEY;
    case "openai":
      return env.OPENAI_API_KEY;
  }
}

const parsed = EnvSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("Invalid environment variables:", parsed.error.flatten().fieldErrors);
  throw new Error("Invalid environment variables");
}

export const env = parsed.data;
export type Env = typeof env;
export type ProviderId = z.infer<typeof ProviderId>;
