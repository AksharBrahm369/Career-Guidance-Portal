import { marksAggregate, normalizeAptitude, normalizeByMax, patternMatch } from "./normalize";
import type { ClusterInput, ClusterScore, StudentProfile } from "./types";

/**
 * Cluster fit (§5.4): a per-cluster weighted blend of the pattern match between
 * the student's normalized interest/aptitude/work-style shapes and the cluster's
 * target profile, plus a marks capability signal. Lens weights sum to 1 and each
 * term is in [0,1], so the score is in [0,1]. Returned sorted by fit, desc.
 */
export function scoreClusters(student: StudentProfile, clusters: ClusterInput[]): ClusterScore[] {
  const interestsNorm = normalizeByMax(student.interests);
  const workStyleNorm = normalizeByMax(student.workStyle);
  const aptitudeNorm = normalizeAptitude(student.aptitude);
  const marksSig = marksAggregate(student.marks);

  return clusters
    .map((c) => {
      const iM = patternMatch(interestsNorm, c.targetProfile.interests);
      const aM = patternMatch(aptitudeNorm, c.targetProfile.aptitude);
      const wM = patternMatch(workStyleNorm, c.targetProfile.workStyle);
      const breakdown = {
        interests: c.lensWeights.interests * iM,
        aptitude: c.lensWeights.aptitude * aM,
        workStyle: c.lensWeights.workStyle * wM,
        marks: c.lensWeights.marks * marksSig,
      };
      const score = breakdown.interests + breakdown.aptitude + breakdown.workStyle + breakdown.marks;
      return { clusterKey: c.key, name: c.name, score, breakdown };
    })
    .sort((a, b) => b.score - a.score);
}
