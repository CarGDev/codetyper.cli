import { v4 as uuidv4 } from "uuid";
import { appStore } from "@tui/index.ts";
import type { LearningResponse } from "@tui/types.ts";
import type { LearningCandidate } from "@services/learning-service.ts";

export const onLearningDetected = async (
  candidate: LearningCandidate,
): Promise<LearningResponse> => {
  return new Promise((resolve) => {
    appStore.setMode("learning_prompt");
    appStore.setLearningPrompt({
      id: uuidv4(),
      content: candidate.content,
      context: candidate.context,
      category: candidate.category,
      resolve: (response: LearningResponse) => {
        appStore.setLearningPrompt(null);
        appStore.setMode("idle");
        resolve(response);
      },
    });
  });
};
