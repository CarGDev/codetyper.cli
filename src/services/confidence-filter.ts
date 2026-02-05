/**
 * Confidence-based filtering service
 * Filters PR review issues and agent outputs by confidence score
 */

import type {
  ConfidenceScore,
  ConfidenceLevel,
  ConfidenceFactor,
  ConfidenceFilterConfig,
  FilteredResult,
  ValidationResult,
  ConfidenceFilterStats,
} from "@/types/confidence-filter";
import {
  CONFIDENCE_LEVELS,
  DEFAULT_CONFIDENCE_FILTER_CONFIG,
} from "@/types/confidence-filter";
import {
  CONFIDENCE_FILTER,
  CONFIDENCE_WEIGHTS,
} from "@constants/confidence-filter";

export const calculateConfidenceLevel = (score: number): ConfidenceLevel => {
  const levels = Object.entries(CONFIDENCE_LEVELS) as Array<
    [ConfidenceLevel, { min: number; max: number }]
  >;
  const found = levels.find(
    ([, range]) => score >= range.min && score <= range.max,
  );
  return found ? found[0] : "low";
};

export const calculateConfidenceScore = (
  factors: ReadonlyArray<ConfidenceFactor>,
): ConfidenceScore => {
  const totalWeight = factors.reduce((sum, f) => sum + f.weight, 0);
  const weightedSum = factors.reduce((sum, f) => sum + f.score * f.weight, 0);
  const value = totalWeight > 0 ? Math.round(weightedSum / totalWeight) : 0;

  return {
    value,
    level: calculateConfidenceLevel(value),
    factors,
  };
};

export const createConfidenceFactor = (
  name: string,
  score: number,
  weight: number,
  reason: string,
): ConfidenceFactor => ({
  name,
  score: Math.max(0, Math.min(100, score)),
  weight: Math.max(0, Math.min(1, weight)),
  reason,
});

export const createPatternMatchFactor = (
  matchCount: number,
  expectedCount: number,
): ConfidenceFactor =>
  createConfidenceFactor(
    "Pattern Match",
    Math.min(100, (matchCount / Math.max(1, expectedCount)) * 100),
    CONFIDENCE_WEIGHTS.PATTERN_MATCH,
    `Matched ${matchCount}/${expectedCount} expected patterns`,
  );

export const createContextRelevanceFactor = (
  relevanceScore: number,
): ConfidenceFactor =>
  createConfidenceFactor(
    "Context Relevance",
    relevanceScore,
    CONFIDENCE_WEIGHTS.CONTEXT_RELEVANCE,
    `Context relevance score: ${relevanceScore}%`,
  );

export const createSeverityFactor = (
  severity: "low" | "medium" | "high" | "critical",
): ConfidenceFactor => {
  const severityScores: Record<string, number> = {
    low: 40,
    medium: 60,
    high: 80,
    critical: 95,
  };
  return createConfidenceFactor(
    "Severity Level",
    severityScores[severity] ?? 50,
    CONFIDENCE_WEIGHTS.SEVERITY_LEVEL,
    `Issue severity: ${severity}`,
  );
};

export const createCodeAnalysisFactor = (
  analysisScore: number,
): ConfidenceFactor =>
  createConfidenceFactor(
    "Code Analysis",
    analysisScore,
    CONFIDENCE_WEIGHTS.CODE_ANALYSIS,
    `Static analysis confidence: ${analysisScore}%`,
  );

export const createHistoricalAccuracyFactor = (
  accuracy: number,
): ConfidenceFactor =>
  createConfidenceFactor(
    "Historical Accuracy",
    accuracy,
    CONFIDENCE_WEIGHTS.HISTORICAL_ACCURACY,
    `Historical accuracy for similar issues: ${accuracy}%`,
  );

export const filterByConfidence = <T>(
  items: ReadonlyArray<{ item: T; confidence: ConfidenceScore }>,
  config: ConfidenceFilterConfig = DEFAULT_CONFIDENCE_FILTER_CONFIG,
): ReadonlyArray<FilteredResult<T>> =>
  items.map(({ item, confidence }) => ({
    item,
    confidence,
    passed: confidence.value >= config.minThreshold,
  }));

export const filterPassedOnly = <T>(
  results: ReadonlyArray<FilteredResult<T>>,
): ReadonlyArray<T> => results.filter((r) => r.passed).map((r) => r.item);

export const groupByConfidenceLevel = <T>(
  results: ReadonlyArray<FilteredResult<T>>,
): Record<ConfidenceLevel, ReadonlyArray<FilteredResult<T>>> => ({
  low: results.filter((r) => r.confidence.level === "low"),
  medium: results.filter((r) => r.confidence.level === "medium"),
  high: results.filter((r) => r.confidence.level === "high"),
  critical: results.filter((r) => r.confidence.level === "critical"),
});

export const calculateFilterStats = <T>(
  results: ReadonlyArray<FilteredResult<T>>,
): ConfidenceFilterStats => {
  const passed = results.filter((r) => r.passed).length;
  const grouped = groupByConfidenceLevel(results);
  const totalConfidence = results.reduce(
    (sum, r) => sum + r.confidence.value,
    0,
  );

  return {
    total: results.length,
    passed,
    filtered: results.length - passed,
    byLevel: {
      low: grouped.low.length,
      medium: grouped.medium.length,
      high: grouped.high.length,
      critical: grouped.critical.length,
    },
    averageConfidence:
      results.length > 0 ? Math.round(totalConfidence / results.length) : 0,
  };
};

export const validateConfidence = async (
  confidence: ConfidenceScore,
  validatorFn: (
    factors: ReadonlyArray<ConfidenceFactor>,
  ) => Promise<{ validated: boolean; adjustment: number; notes: string }>,
): Promise<ValidationResult> => {
  const result = await validatorFn(confidence.factors);

  return {
    validated: result.validated,
    adjustedConfidence: Math.max(
      0,
      Math.min(100, confidence.value + result.adjustment),
    ),
    validatorNotes: result.notes,
  };
};

export const formatConfidenceScore = (
  confidence: ConfidenceScore,
  showFactors: boolean = false,
): string => {
  const levelColors: Record<ConfidenceLevel, string> = {
    low: "\x1b[90m",
    medium: "\x1b[33m",
    high: "\x1b[32m",
    critical: "\x1b[31m",
  };
  const reset = "\x1b[0m";
  const color = levelColors[confidence.level];

  let result = `${color}[${confidence.value}% - ${confidence.level.toUpperCase()}]${reset}`;

  if (showFactors && confidence.factors.length > 0) {
    const factorLines = confidence.factors
      .map(
        (f: ConfidenceFactor) =>
          `  - ${f.name}: ${f.score}% (weight: ${f.weight})`,
      )
      .join("\n");
    result += `\n${factorLines}`;
  }

  return result;
};

export const mergeConfidenceFactors = (
  existing: ReadonlyArray<ConfidenceFactor>,
  additional: ReadonlyArray<ConfidenceFactor>,
): ReadonlyArray<ConfidenceFactor> => {
  const factorMap = new Map<string, ConfidenceFactor>();

  existing.forEach((f) => factorMap.set(f.name, f));
  additional.forEach((f) => {
    const existingFactor = factorMap.get(f.name);
    if (existingFactor) {
      // Average the scores if factor already exists
      factorMap.set(f.name, {
        ...f,
        score: Math.round((existingFactor.score + f.score) / 2),
      });
    } else {
      factorMap.set(f.name, f);
    }
  });

  return Array.from(factorMap.values());
};

export const adjustThreshold = (
  baseThreshold: number,
  context: {
    isCritical: boolean;
    isAutomated: boolean;
    userPreference?: number;
  },
): number => {
  let threshold = context.userPreference ?? baseThreshold;

  // Lower threshold for critical contexts
  if (context.isCritical) {
    threshold = Math.max(CONFIDENCE_FILTER.MIN_THRESHOLD, threshold - 10);
  }

  // Higher threshold for automated contexts
  if (context.isAutomated) {
    threshold = Math.min(CONFIDENCE_FILTER.MAX_THRESHOLD, threshold + 10);
  }

  return threshold;
};
