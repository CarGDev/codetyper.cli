/**
 * Learning candidate deduplication
 */

import type { LearningCandidate } from "@/types/learning";

const normalizeContent = (content: string): string =>
  content.toLowerCase().trim();

export const deduplicateCandidates = (
  candidates: LearningCandidate[],
): LearningCandidate[] => {
  const seen = new Set<string>();

  return candidates.filter((candidate) => {
    const key = normalizeContent(candidate.content);

    if (seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
};
