/**
 * Confidence-based filtering types for PR review and agent outputs
 * Filters issues/findings by confidence score threshold
 */

export type ConfidenceLevel = "low" | "medium" | "high" | "critical";

export interface ConfidenceScore {
  readonly value: number; // 0-100
  readonly level: ConfidenceLevel;
  readonly factors: ReadonlyArray<ConfidenceFactor>;
}

export interface ConfidenceFactor {
  readonly name: string;
  readonly weight: number; // 0-1
  readonly score: number; // 0-100
  readonly reason: string;
}

export interface ConfidenceFilterConfig {
  readonly minThreshold: number; // Minimum confidence to include (default: 80)
  readonly includeValidation: boolean; // Run validation subagent
  readonly groupByLevel: boolean; // Group results by confidence level
  readonly showFactors: boolean; // Show contributing factors
}

export interface FilteredResult<T> {
  readonly item: T;
  readonly confidence: ConfidenceScore;
  readonly passed: boolean;
  readonly validationResult?: ValidationResult;
}

export interface ValidationResult {
  readonly validated: boolean;
  readonly adjustedConfidence: number;
  readonly validatorNotes: string;
}

export interface ConfidenceFilterStats {
  readonly total: number;
  readonly passed: number;
  readonly filtered: number;
  readonly byLevel: Record<ConfidenceLevel, number>;
  readonly averageConfidence: number;
}

export const CONFIDENCE_LEVELS: Record<
  ConfidenceLevel,
  { min: number; max: number; color: string }
> = {
  low: { min: 0, max: 49, color: "gray" },
  medium: { min: 50, max: 74, color: "yellow" },
  high: { min: 75, max: 89, color: "green" },
  critical: { min: 90, max: 100, color: "red" },
};

export const DEFAULT_CONFIDENCE_FILTER_CONFIG: ConfidenceFilterConfig = {
  minThreshold: 80,
  includeValidation: true,
  groupByLevel: true,
  showFactors: false,
};
