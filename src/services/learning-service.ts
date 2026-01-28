/**
 * Learning Service - Detects and manages project learnings
 *
 * Identifies patterns in conversations that should be remembered:
 * - User preferences (language, file types, coding style)
 * - Project conventions (architecture, patterns)
 * - Workflow decisions
 * - Common patterns to follow
 */

export { detectLearnings } from "@services/learning/detect";
export { analyzeMessage } from "@services/learning/analyze";
export { analyzeAssistantResponse } from "@services/learning/assistant";
export { categorizePattern } from "@services/learning/categorize";
export { deduplicateCandidates } from "@services/learning/deduplicate";
export {
  extractLearningContent,
  extractLearningFromAcknowledgment,
} from "@services/learning/extract";
export { formatLearningForPrompt } from "@services/learning/format";
export {
  saveLearning,
  getLearnings,
  learningExists,
} from "@services/learning/persistence";
export type {
  LearningCandidate,
  LearningCategory,
  StoredLearning,
  MessageSource,
  LearningPatternMatch,
} from "@/types/learning";
