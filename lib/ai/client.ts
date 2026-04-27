import "server-only";
import type { LanguageModel } from "ai";
import { ensureProviderConfigured, resolveProvider, type FeatureId } from "./providers";

export function getModel(feature: FeatureId): { model: LanguageModel; supportsCacheControl: boolean; providerLabel: string } {
  const spec = resolveProvider(feature);
  ensureProviderConfigured(spec);
  return {
    model: spec.build(),
    supportsCacheControl: spec.supportsExplicitCacheControl,
    providerLabel: spec.label,
  };
}
