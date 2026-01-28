/**
 * Learning detection orchestration
 */

import { analyzeMessage } from "@services/learning/analyze";
import { analyzeAssistantResponse } from "@services/learning/assistant";
import { deduplicateCandidates } from "@services/learning/deduplicate";
import type { LearningCandidate } from "@/types/learning";

const sortByConfidence = (a: LearningCandidate, b: LearningCandidate): number =>
  b.confidence - a.confidence;

export const detectLearnings = (
  userMessage: string,
  assistantResponse: string,
): LearningCandidate[] => {
  const candidates: LearningCandidate[] = [];

  const userLearnings = analyzeMessage(userMessage, "user");
  candidates.push(...userLearnings);

  const assistantLearnings = analyzeAssistantResponse(
    userMessage,
    assistantResponse,
  );
  candidates.push(...assistantLearnings);

  return deduplicateCandidates(candidates).sort(sortByConfidence);
};
