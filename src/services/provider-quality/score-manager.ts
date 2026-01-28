/**
 * Score Manager Service
 *
 * Manages quality scores for providers based on outcomes
 */

import type { TaskType, QualityScore } from "@/types/provider-quality";
import {
  getProviderQuality,
  updateProviderQuality,
  calculateOverallScore,
} from "./persistence";

export type Outcome = "approved" | "corrected" | "rejected" | "minor_issue" | "major_issue";

export interface ScoreUpdate {
  providerId: string;
  taskType: TaskType;
  outcome: Outcome;
}

export const updateQualityScore = async (update: ScoreUpdate): Promise<void> => {
  const { providerId, taskType, outcome } = update;
  const data = await getProviderQuality(providerId);
  const score = data.scores[taskType];

  const outcomeCounters: Record<Outcome, keyof QualityScore> = {
    approved: "successCount",
    corrected: "correctionCount",
    rejected: "userRejectionCount",
    minor_issue: "correctionCount",
    major_issue: "correctionCount",
  };

  const counterKey = outcomeCounters[outcome];
  (score[counterKey] as number)++;
  score.lastUpdated = Date.now();

  data.overallScore = calculateOverallScore(data.scores);
  await updateProviderQuality(data);
};

export const getTaskScore = async (
  providerId: string,
  taskType: TaskType,
): Promise<number> => {
  const data = await getProviderQuality(providerId);
  const score = data.scores[taskType];

  const total =
    score.successCount + score.correctionCount + score.userRejectionCount;

  if (total === 0) {
    return 0.5;
  }

  return score.successCount / total;
};

export const getOverallScore = async (providerId: string): Promise<number> => {
  const data = await getProviderQuality(providerId);
  return data.overallScore;
};

export const recordApproval = async (
  providerId: string,
  taskType: TaskType,
): Promise<void> => {
  await updateQualityScore({ providerId, taskType, outcome: "approved" });
};

export const recordCorrection = async (
  providerId: string,
  taskType: TaskType,
): Promise<void> => {
  await updateQualityScore({ providerId, taskType, outcome: "corrected" });
};

export const recordRejection = async (
  providerId: string,
  taskType: TaskType,
): Promise<void> => {
  await updateQualityScore({ providerId, taskType, outcome: "rejected" });
};

export const recordAuditResult = async (
  providerId: string,
  taskType: TaskType,
  approved: boolean,
  hasMajorIssues: boolean,
): Promise<void> => {
  if (approved) {
    await recordApproval(providerId, taskType);
    return;
  }

  const outcome: Outcome = hasMajorIssues ? "major_issue" : "minor_issue";
  await updateQualityScore({ providerId, taskType, outcome });
};
