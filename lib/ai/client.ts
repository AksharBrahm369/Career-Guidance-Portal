import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { env } from "@/lib/env";

// Model ID pinned decision — spec references `claude-sonnet-4-20250514`.
// Current Claude model family is 4.X: latest Sonnet = claude-sonnet-4-6, latest Opus = claude-opus-4-7.
// Confirm with user before M2 before baking a specific string into fetch / Q&A prompts.
export const DEFAULT_MODEL = "claude-sonnet-4-6";

const globalForAnthropic = globalThis as unknown as { __anthropic?: Anthropic };

export const anthropic =
  globalForAnthropic.__anthropic ??
  new Anthropic({
    apiKey: env.ANTHROPIC_API_KEY,
  });

if (env.NODE_ENV !== "production") {
  globalForAnthropic.__anthropic = anthropic;
}
