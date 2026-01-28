/**
 * Learning content extraction utilities
 */

import { LEARNING_DEFAULTS } from "@constants/learning";

const splitIntoSentences = (text: string): string[] =>
  text.split(/[.!?]+/).filter((s) => s.trim());

const findMatchingSentence = (
  sentences: string[],
  matchText: string,
): string | null => {
  const lowerMatch = matchText.toLowerCase();
  return sentences.find((s) => s.toLowerCase().includes(lowerMatch)) ?? null;
};

export const extractLearningContent = (
  message: string,
  match: RegExpMatchArray,
): string => {
  const sentences = splitIntoSentences(message);
  const matchingSentence = findMatchingSentence(sentences, match[0]);

  return matchingSentence?.trim() ?? match[0];
};

export const extractLearningFromAcknowledgment = (
  userMessage: string,
): string => {
  const sentences = splitIntoSentences(userMessage);

  if (sentences.length > 0) {
    return sentences[0].trim();
  }

  return userMessage.slice(0, LEARNING_DEFAULTS.MAX_SLICE_LENGTH);
};
