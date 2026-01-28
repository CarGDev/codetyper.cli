/**
 * Task Type Detection Service
 *
 * Detects the type of task from user prompts to route appropriately
 */

import type { TaskType } from "@/types/provider-quality";
import { TASK_TYPE_PATTERNS } from "@constants/provider-quality";

const TASK_TYPES: TaskType[] = [
  "code_generation",
  "refactoring",
  "bug_fix",
  "documentation",
  "testing",
  "explanation",
  "review",
  "general",
];

export const detectTaskType = (prompt: string): TaskType => {
  const normalizedPrompt = prompt.toLowerCase();

  for (const taskType of TASK_TYPES) {
    const patterns = TASK_TYPE_PATTERNS[taskType];

    for (const pattern of patterns) {
      if (pattern.test(normalizedPrompt)) {
        return taskType;
      }
    }
  }

  return "general";
};

export const getTaskTypeConfidence = (
  prompt: string,
  detectedType: TaskType,
): number => {
  const patterns = TASK_TYPE_PATTERNS[detectedType];

  if (patterns.length === 0) {
    return 0.3;
  }

  const matchCount = patterns.filter((p) => p.test(prompt.toLowerCase())).length;
  const confidence = Math.min(0.5 + matchCount * 0.15, 1.0);

  return confidence;
};
