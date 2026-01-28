/**
 * Learning persistence operations
 */

import { projectConfig } from "@services/project-config";
import type { StoredLearning } from "@/types/learning";
import { indexLearning } from "@services/learning/semantic-search";

export const saveLearning = async (
  content: string,
  context?: string,
  global = false,
): Promise<void> => {
  // Save the learning
  const learning = await projectConfig.addLearning(content, context, global);

  // Index for semantic search (non-blocking, don't fail if embeddings unavailable)
  if (learning) {
    indexLearning(learning, global).catch(() => {
      // Silently ignore embedding failures
    });
  }
};

export const getLearnings = async (): Promise<StoredLearning[]> =>
  projectConfig.getLearnings();

const normalizeForComparison = (text: string): string =>
  text.toLowerCase().trim();

const isSimilarContent = (existing: string, newContent: string): boolean => {
  const normalizedExisting = normalizeForComparison(existing);
  const normalizedNew = normalizeForComparison(newContent);

  return (
    normalizedExisting === normalizedNew ||
    normalizedExisting.includes(normalizedNew) ||
    normalizedNew.includes(normalizedExisting)
  );
};

export const learningExists = async (content: string): Promise<boolean> => {
  const learnings = await getLearnings();

  return learnings.some((learning) =>
    isSimilarContent(learning.content, content),
  );
};
