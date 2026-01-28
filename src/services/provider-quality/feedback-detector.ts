/**
 * Feedback Detection Service
 *
 * Detects user feedback from messages to update quality scores
 */

import {
  NEGATIVE_FEEDBACK_PATTERNS,
  POSITIVE_FEEDBACK_PATTERNS,
} from "@constants/provider-quality";

export type FeedbackType = "positive" | "negative" | "neutral";

export interface FeedbackResult {
  type: FeedbackType;
  confidence: number;
  matchedPatterns: string[];
}

export const detectFeedback = (message: string): FeedbackResult => {
  const normalizedMessage = message.toLowerCase();
  const negativeMatches: string[] = [];
  const positiveMatches: string[] = [];

  for (const pattern of NEGATIVE_FEEDBACK_PATTERNS) {
    const match = normalizedMessage.match(pattern);
    if (match) {
      negativeMatches.push(match[0]);
    }
  }

  for (const pattern of POSITIVE_FEEDBACK_PATTERNS) {
    const match = normalizedMessage.match(pattern);
    if (match) {
      positiveMatches.push(match[0]);
    }
  }

  if (negativeMatches.length > positiveMatches.length) {
    return {
      type: "negative",
      confidence: Math.min(0.5 + negativeMatches.length * 0.2, 1.0),
      matchedPatterns: negativeMatches,
    };
  }

  if (positiveMatches.length > negativeMatches.length) {
    return {
      type: "positive",
      confidence: Math.min(0.5 + positiveMatches.length * 0.2, 1.0),
      matchedPatterns: positiveMatches,
    };
  }

  return {
    type: "neutral",
    confidence: 1.0,
    matchedPatterns: [],
  };
};

export const isCorrection = (message: string): boolean => {
  const feedback = detectFeedback(message);
  return feedback.type === "negative" && feedback.confidence >= 0.6;
};

export const isApproval = (message: string): boolean => {
  const feedback = detectFeedback(message);
  return feedback.type === "positive" && feedback.confidence >= 0.6;
};
