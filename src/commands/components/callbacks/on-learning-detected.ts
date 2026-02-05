import { v4 as uuidv4 } from "uuid";
import { appStore } from "@tui-solid/context/app";
import type { LearningResponse } from "@/types/tui";
import type { LearningCandidate } from "@services/learning-service";

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
