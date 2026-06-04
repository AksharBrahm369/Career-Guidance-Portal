type Responses = { interests?: Record<string, string>; work_style?: Record<string, string> };

/**
 * Careless-response (straight-lining) detection: a self-report module
 * with at least 4 answers all set to the same option is a red flag.
 */
function straightLined(answers?: Record<string, string>): boolean {
  if (!answers) return false;
  const vals = Object.values(answers);
  return vals.length >= 4 && new Set(vals).size === 1;
}

/**
 * Data-quality signal for the captured profile. If any self-report
 * module looks straight-lined, confidence drops to "low".
 */
export function computeConfidence(responses: Responses): "high" | "moderate" | "low" {
  const flags = [straightLined(responses.interests), straightLined(responses.work_style)].filter(
    Boolean,
  ).length;
  if (flags >= 1) return "low";
  return "high";
}
