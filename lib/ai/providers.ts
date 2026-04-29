import "server-only";
import { createAnthropic } from "@ai-sdk/anthropic";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createOpenAI } from "@ai-sdk/openai";
import type { LanguageModel } from "ai";
import { env, type ProviderId } from "@/lib/env";

export type FeatureId = "fetch" | "qa";

export interface ProviderSpec {
  id: ProviderId;
  label: string;
  modelId: string;
  /**
   * Anthropic supports explicit `cacheControl` provider metadata on system/user blocks.
   * Google does its own context caching (different API), OpenAI caches automatically.
   * Consumers can branch on this to attach `providerMetadata.anthropic.cacheControl`
   * only when it'll actually do something.
   */
  supportsExplicitCacheControl: boolean;
  build(): LanguageModel;
}

export const PROVIDERS: Record<ProviderId, ProviderSpec> = {
  anthropic: {
    id: "anthropic",
    label: "Anthropic Claude Sonnet 4.6",
    modelId: "claude-sonnet-4-6",
    supportsExplicitCacheControl: true,
    build() {
      const anthropic = createAnthropic({ apiKey: env.ANTHROPIC_API_KEY });
      return anthropic(this.modelId);
    },
  },
  google: {
    id: "google",
    label: "Google Gemini 2.5 Flash",
    modelId: "gemini-2.5-flash",
    supportsExplicitCacheControl: false,
    build() {
      const google = createGoogleGenerativeAI({ apiKey: env.GOOGLE_GENERATIVE_AI_API_KEY });
      return google(this.modelId);
    },
  },
  openai: {
    id: "openai",
    label: "OpenAI GPT-4o",
    modelId: "gpt-4o",
    supportsExplicitCacheControl: false,
    build() {
      const openai = createOpenAI({ apiKey: env.OPENAI_API_KEY });
      return openai(this.modelId);
    },
  },
};

export function resolveProvider(feature: FeatureId): ProviderSpec {
  const override =
    feature === "fetch" ? env.AI_FETCH_PROVIDER : feature === "qa" ? env.AI_QA_PROVIDER : undefined;
  const id = override ?? env.AI_PROVIDER;
  return PROVIDERS[id];
}

export function ensureProviderConfigured(spec: ProviderSpec): void {
  const key =
    spec.id === "anthropic"
      ? env.ANTHROPIC_API_KEY
      : spec.id === "google"
        ? env.GOOGLE_GENERATIVE_AI_API_KEY
        : env.OPENAI_API_KEY;
  if (!key) {
    throw new Error(
      `AI provider "${spec.id}" selected but its API key env var is not set. ` +
      `Set ${spec.id === "anthropic"
        ? "ANTHROPIC_API_KEY"
        : spec.id === "google"
          ? "GOOGLE_GENERATIVE_AI_API_KEY"
          : "OPENAI_API_KEY"
      }.`,
    );
  }
}
