/**
 * Assistant response analysis for learning detection
 */

import {
  ACKNOWLEDGMENT_PATTERNS,
  ACKNOWLEDGMENT_PHRASES,
  LEARNING_DEFAULTS,
  LEARNING_CONTEXTS,
} from "@constants/learning";
import { analyzeMessage } from "@services/learning/analyze";
import { extractLearningFromAcknowledgment } from "@services/learning/extract";
import type { LearningCandidate } from "@/types/learning";

const findAcknowledgmentMatches = (
  userMessage: string,
  assistantResponse: string,
): LearningCandidate[] => {
  const candidates: LearningCandidate[] = [];

  for (const pattern of ACKNOWLEDGMENT_PATTERNS) {
    const match = assistantResponse.match(pattern);
    if (match) {
      candidates.push({
        content: extractLearningFromAcknowledgment(userMessage),
        context: LEARNING_CONTEXTS.CONVENTION_CONFIRMED,
        confidence: LEARNING_DEFAULTS.ACKNOWLEDGMENT_CONFIDENCE,
        category: "convention",
      });
    }
  }

  return candidates;
};

const hasAcknowledgmentPhrase = (response: string): boolean =>
  ACKNOWLEDGMENT_PHRASES.some((phrase) => response.includes(phrase));

const boostConfidence = (candidate: LearningCandidate): LearningCandidate => ({
  ...candidate,
  confidence: Math.min(
    candidate.confidence + LEARNING_DEFAULTS.CONFIDENCE_BOOST,
    LEARNING_DEFAULTS.MAX_CONFIDENCE,
  ),
  context: LEARNING_CONTEXTS.PREFERENCE_ACKNOWLEDGED,
});

const getAcknowledgedLearnings = (userMessage: string): LearningCandidate[] => {
  const userLearnings = analyzeMessage(userMessage, "user");
  return userLearnings.map(boostConfidence);
};

export const analyzeAssistantResponse = (
  userMessage: string,
  assistantResponse: string,
): LearningCandidate[] => {
  const candidates: LearningCandidate[] = [];
  const lowerResponse = assistantResponse.toLowerCase();

  const acknowledgmentMatches = findAcknowledgmentMatches(
    userMessage,
    assistantResponse,
  );
  candidates.push(...acknowledgmentMatches);

  if (hasAcknowledgmentPhrase(lowerResponse)) {
    const acknowledgedLearnings = getAcknowledgedLearnings(userMessage);
    candidates.push(...acknowledgedLearnings);
  }

  return candidates;
};
