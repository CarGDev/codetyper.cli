/**
 * Provider Quality Persistence Service
 *
 * Saves and loads provider quality data to/from disk
 */

import { join } from "path";
import { homedir } from "os";
import type {
  ProviderQualityData,
  TaskType,
  QualityScore,
} from "@/types/provider-quality";
import { QUALITY_THRESHOLDS } from "@constants/provider-quality";

const QUALITY_DATA_DIR = join(homedir(), ".config", "codetyper");
const QUALITY_DATA_FILE = "provider-quality.json";

const getQualityDataPath = (): string => {
  return join(QUALITY_DATA_DIR, QUALITY_DATA_FILE);
};

const ensureDataDir = async (): Promise<void> => {
  const fs = await import("fs/promises");
  try {
    await fs.mkdir(QUALITY_DATA_DIR, { recursive: true });
  } catch {
    // Directory exists
  }
};

const createDefaultScores = (): Record<TaskType, QualityScore> => {
  const scores: Partial<Record<TaskType, QualityScore>> = {};
  const taskTypes: TaskType[] = [
    "code_generation",
    "refactoring",
    "bug_fix",
    "documentation",
    "testing",
    "explanation",
    "review",
    "general",
  ];

  for (const taskType of taskTypes) {
    scores[taskType] = {
      taskType,
      successCount: 0,
      correctionCount: 0,
      userRejectionCount: 0,
      lastUpdated: Date.now(),
    };
  }

  return scores as Record<TaskType, QualityScore>;
};

export const loadQualityData = async (): Promise<
  Record<string, ProviderQualityData>
> => {
  const fs = await import("fs/promises");
  const filePath = getQualityDataPath();

  try {
    const content = await fs.readFile(filePath, "utf-8");
    return JSON.parse(content) as Record<string, ProviderQualityData>;
  } catch {
    return {};
  }
};

export const saveQualityData = async (
  data: Record<string, ProviderQualityData>,
): Promise<void> => {
  const fs = await import("fs/promises");
  await ensureDataDir();
  const filePath = getQualityDataPath();
  await fs.writeFile(filePath, JSON.stringify(data, null, 2));
};

export const getProviderQuality = async (
  providerId: string,
): Promise<ProviderQualityData> => {
  const allData = await loadQualityData();

  if (allData[providerId]) {
    return allData[providerId];
  }

  return {
    providerId,
    scores: createDefaultScores(),
    overallScore: QUALITY_THRESHOLDS.INITIAL,
  };
};

export const updateProviderQuality = async (
  data: ProviderQualityData,
): Promise<void> => {
  const allData = await loadQualityData();
  allData[data.providerId] = data;
  await saveQualityData(allData);
};

export const calculateOverallScore = (
  scores: Record<TaskType, QualityScore>,
): number => {
  const taskTypes = Object.keys(scores) as TaskType[];
  let totalWeight = 0;
  let weightedScore = 0;

  for (const taskType of taskTypes) {
    const score = scores[taskType];
    const total =
      score.successCount + score.correctionCount + score.userRejectionCount;

    if (total === 0) {
      continue;
    }

    const successRate = score.successCount / total;
    const weight = total;
    weightedScore += successRate * weight;
    totalWeight += weight;
  }

  if (totalWeight === 0) {
    return QUALITY_THRESHOLDS.INITIAL;
  }

  return weightedScore / totalWeight;
};
