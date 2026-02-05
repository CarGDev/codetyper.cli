/**
 * Provider Router Service
 *
 * Determines which provider(s) to use based on quality scores
 */

import type { TaskType, RoutingDecision } from "@/types/provider-quality";
import { CASCADE_CONFIG, PROVIDER_IDS } from "@constants/provider-quality";
import { getTaskScore, getOverallScore } from "./score-manager";

export interface RoutingContext {
  taskType: TaskType;
  ollamaAvailable: boolean;
  copilotAvailable: boolean;
  cascadeEnabled: boolean;
}

export const determineRoute = async (
  context: RoutingContext,
): Promise<RoutingDecision> => {
  const { taskType, ollamaAvailable, copilotAvailable, cascadeEnabled } =
    context;

  if (!ollamaAvailable && !copilotAvailable) {
    throw new Error("No providers available");
  }

  if (!ollamaAvailable) {
    return "copilot_only";
  }

  if (!copilotAvailable) {
    return "ollama_only";
  }

  if (!cascadeEnabled) {
    return "ollama_only";
  }

  const ollamaScore = await getTaskScore(PROVIDER_IDS.OLLAMA, taskType);
  const ollamaOverall = await getOverallScore(PROVIDER_IDS.OLLAMA);

  if (ollamaScore >= CASCADE_CONFIG.MIN_AUDIT_THRESHOLD) {
    return "ollama_only";
  }

  if (ollamaOverall >= CASCADE_CONFIG.MIN_AUDIT_THRESHOLD) {
    return "ollama_only";
  }

  if (ollamaScore <= CASCADE_CONFIG.MAX_SKIP_THRESHOLD) {
    return "copilot_only";
  }

  return "cascade";
};

export const shouldAudit = async (
  taskType: TaskType,
  ollamaAvailable: boolean,
): Promise<boolean> => {
  if (!ollamaAvailable) {
    return false;
  }

  const ollamaScore = await getTaskScore(PROVIDER_IDS.OLLAMA, taskType);

  return ollamaScore < CASCADE_CONFIG.MIN_AUDIT_THRESHOLD;
};

export const getRoutingExplanation = async (
  decision: RoutingDecision,
  taskType: TaskType,
): Promise<string> => {
  const ollamaScore = await getTaskScore(PROVIDER_IDS.OLLAMA, taskType);
  const scorePercent = Math.round(ollamaScore * 100);

  const explanations: Record<RoutingDecision, string> = {
    ollama_only: `Using Ollama (score: ${scorePercent}% - trusted for ${taskType})`,
    copilot_only: `Using Copilot (Ollama score: ${scorePercent}% - needs improvement for ${taskType})`,
    cascade: `Using Ollama with Copilot audit (score: ${scorePercent}% - building trust for ${taskType})`,
  };

  return explanations[decision];
};
