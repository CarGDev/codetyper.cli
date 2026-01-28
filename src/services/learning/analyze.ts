/**
 * Message analysis for learning detection
 */

import {
  LEARNING_PATTERNS,
  LEARNING_KEYWORDS,
  LEARNING_DEFAULTS,
  LEARNING_CONTEXTS,
} from "@constants/learning";
import { categorizePattern } from "@services/learning/categorize";
import { extractLearningContent } from "@services/learning/extract";
import type { LearningCandidate, MessageSource } from "@/types/learning";

const getContextForSource = (source: MessageSource): string =>
  source === "user"
    ? LEARNING_CONTEXTS.USER_PREFERENCE
    : LEARNING_CONTEXTS.CONVENTION_IDENTIFIED;

const findPatternMatches = (
  message: string,
  source: MessageSource,
): LearningCandidate[] => {
  const candidates: LearningCandidate[] = [];

  for (const pattern of LEARNING_PATTERNS) {
    const match = message.match(pattern);
    if (match) {
      candidates.push({
        content: extractLearningContent(message, match),
        context: getContextForSource(source),
        confidence: LEARNING_DEFAULTS.BASE_PATTERN_CONFIDENCE,
        category: categorizePattern(pattern),
      });
    }
  }

  return candidates;
};

const countKeywords = (text: string): number =>
  LEARNING_KEYWORDS.filter((keyword) => text.includes(keyword)).length;

const extractKeywordSentences = (message: string): LearningCandidate[] => {
  const candidates: LearningCandidate[] = [];
  const sentences = message.split(/[.!?]+/).filter((s) => s.trim());

  for (const sentence of sentences) {
    const sentenceLower = sentence.toLowerCase();
    const keywordCount = countKeywords(sentenceLower);

    if (keywordCount >= LEARNING_DEFAULTS.MIN_KEYWORDS_FOR_LEARNING) {
      const confidence =
        LEARNING_DEFAULTS.BASE_KEYWORD_CONFIDENCE +
        keywordCount * LEARNING_DEFAULTS.KEYWORD_CONFIDENCE_INCREMENT;

      candidates.push({
        content: sentence.trim(),
        context: LEARNING_CONTEXTS.MULTIPLE_INDICATORS,
        confidence,
        category: "general",
      });
    }
  }

  return candidates;
};

export const analyzeMessage = (
  message: string,
  source: MessageSource,
): LearningCandidate[] => {
  const candidates: LearningCandidate[] = [];
  const lowerMessage = message.toLowerCase();

  const patternMatches = findPatternMatches(message, source);
  candidates.push(...patternMatches);

  const keywordCount = countKeywords(lowerMessage);
  if (keywordCount >= LEARNING_DEFAULTS.MIN_KEYWORDS_FOR_LEARNING) {
    const keywordSentences = extractKeywordSentences(message);
    candidates.push(...keywordSentences);
  }

  return candidates;
};
