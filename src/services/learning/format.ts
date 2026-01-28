/**
 * Learning formatting utilities
 */

import { LEARNING_DEFAULTS } from "@constants/learning";
import type { LearningCandidate } from "@/types/learning";

export const formatLearningForPrompt = (
  candidate: LearningCandidate,
): string =>
  candidate.content.length > LEARNING_DEFAULTS.MAX_CONTENT_LENGTH
    ? candidate.content.slice(0, LEARNING_DEFAULTS.TRUNCATE_LENGTH) + "..."
    : candidate.content;
