/**
 * Confidence filtering constants
 */

export const CONFIDENCE_FILTER = {
  DEFAULT_THRESHOLD: 80,
  MIN_THRESHOLD: 0,
  MAX_THRESHOLD: 100,
  VALIDATION_TIMEOUT: 30000,
  MAX_BATCH_SIZE: 50,
} as const;

export const CONFIDENCE_WEIGHTS = {
  PATTERN_MATCH: 0.3,
  CONTEXT_RELEVANCE: 0.25,
  SEVERITY_LEVEL: 0.2,
  CODE_ANALYSIS: 0.15,
  HISTORICAL_ACCURACY: 0.1,
} as const;

export const CONFIDENCE_MESSAGES = {
  BELOW_THRESHOLD: "Filtered out due to low confidence",
  VALIDATION_FAILED: "Confidence adjusted after validation",
  VALIDATION_PASSED: "Confidence validated successfully",
  NO_FACTORS: "No confidence factors available",
} as const;

export const CONFIDENCE_COLORS = {
  LOW: "#808080",
  MEDIUM: "#FFA500",
  HIGH: "#00FF00",
  CRITICAL: "#FF0000",
} as const;
