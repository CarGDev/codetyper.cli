/**
 * Chat TUI learnings handling
 */

import {
  CHAT_MESSAGES,
  LEARNING_CONFIDENCE_THRESHOLD,
  MAX_LEARNINGS_DISPLAY,
} from "@constants/chat-service";
import { getMessageText } from "@/types/providers";
import {
  detectLearnings,
  saveLearning,
  getLearnings,
  learningExists,
} from "@services/learning-service";
import type {
  ChatServiceState,
  ChatServiceCallbacks,
} from "@/types/chat-service";

export const handleRememberCommand = async (
  state: ChatServiceState,
  callbacks: ChatServiceCallbacks,
): Promise<void> => {
  const lastUserMsg = [...state.messages]
    .reverse()
    .find((m) => m.role === "user");
  const lastAssistantMsg = [...state.messages]
    .reverse()
    .find((m) => m.role === "assistant");

  if (!lastUserMsg || !lastAssistantMsg) {
    callbacks.onLog("system", CHAT_MESSAGES.NO_CONVERSATION);
    return;
  }

  const candidates = detectLearnings(
    getMessageText(lastUserMsg.content),
    getMessageText(lastAssistantMsg.content),
  );

  if (candidates.length === 0) {
    callbacks.onLog("system", CHAT_MESSAGES.NO_LEARNINGS_DETECTED);
    return;
  }

  if (callbacks.onLearningDetected) {
    const topCandidate = candidates[0];
    const response = await callbacks.onLearningDetected(topCandidate);
    if (response.save && response.scope) {
      await saveLearning(
        response.editedContent || topCandidate.content,
        topCandidate.context,
        response.scope === "global",
      );
      callbacks.onLog("system", CHAT_MESSAGES.LEARNING_SAVED(response.scope));
    } else {
      callbacks.onLog("system", CHAT_MESSAGES.LEARNING_SKIPPED);
    }
  } else {
    callbacks.onLog(
      "system",
      `Detected learnings:\n${candidates.map((c) => `- ${c.content}`).join("\n")}`,
    );
  }
};

export const handleLearningsCommand = async (
  callbacks: ChatServiceCallbacks,
): Promise<void> => {
  const learnings = await getLearnings();

  if (learnings.length === 0) {
    callbacks.onLog("system", CHAT_MESSAGES.NO_LEARNINGS);
    return;
  }

  const formatted = learnings
    .slice(0, MAX_LEARNINGS_DISPLAY)
    .map((l, i) => `${i + 1}. ${l.content}`)
    .join("\n");

  callbacks.onLog(
    "system",
    `Saved learnings (${learnings.length} total):\n${formatted}${learnings.length > MAX_LEARNINGS_DISPLAY ? "\n... and more" : ""}`,
  );
};

export const processLearningsFromExchange = async (
  userMessage: string,
  assistantResponse: string,
  callbacks: ChatServiceCallbacks,
): Promise<void> => {
  if (!callbacks.onLearningDetected) return;

  const candidates = detectLearnings(userMessage, assistantResponse);

  for (const candidate of candidates) {
    if (candidate.confidence >= LEARNING_CONFIDENCE_THRESHOLD) {
      const exists = await learningExists(candidate.content);
      if (!exists) {
        const response = await callbacks.onLearningDetected(candidate);
        if (response.save && response.scope) {
          await saveLearning(
            response.editedContent || candidate.content,
            candidate.context,
            response.scope === "global",
          );
          callbacks.onLog(
            "system",
            CHAT_MESSAGES.LEARNING_SAVED(response.scope),
          );
        }
        break;
      }
    }
  }
};
