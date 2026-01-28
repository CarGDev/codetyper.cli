/**
 * Learning Service constants
 */

import type { LearningCategory } from "@/types/learning";

export const LEARNING_PATTERNS = [
  // User preferences
  /always use (\w+)/i,
  /prefer (\w+) over (\w+)/i,
  /use (\.\w+) files?/i,
  /don't use (\w+)/i,
  /never use (\w+)/i,
  /code in (\w+)/i,
  /write in (\w+)/i,

  // Project structure
  /put .+ in (.+) directory/i,
  /files? should be in (.+)/i,
  /follow (.+) pattern/i,
  /use (.+) architecture/i,

  // Coding style
  /use (.+) naming convention/i,
  /follow (.+) style/i,
  /indent with (\w+)/i,
  /use (single|double) quotes/i,

  // Testing
  /use (.+) for testing/i,
  /tests? should (.+)/i,

  // Dependencies
  /use (.+) library/i,
  /prefer (.+) package/i,
] as const;

export const LEARNING_KEYWORDS = [
  "always",
  "never",
  "prefer",
  "convention",
  "standard",
  "pattern",
  "rule",
  "style",
  "remember",
  "important",
  "must",
  "should",
] as const;

export const ACKNOWLEDGMENT_PATTERNS = [
  /i('ll| will) (use|follow|apply) (.+)/i,
  /using (.+) as (you|per your) (requested|preference)/i,
  /following (.+) (convention|pattern|style)/i,
  /noted.+ (will|going to) (.+)/i,
] as const;

export const ACKNOWLEDGMENT_PHRASES = [
  "i understand",
  "got it",
  "noted",
] as const;

export const LEARNING_DEFAULTS = {
  BASE_PATTERN_CONFIDENCE: 0.7,
  BASE_KEYWORD_CONFIDENCE: 0.5,
  KEYWORD_CONFIDENCE_INCREMENT: 0.1,
  ACKNOWLEDGMENT_CONFIDENCE: 0.8,
  CONFIDENCE_BOOST: 0.2,
  MAX_CONFIDENCE: 1.0,
  MIN_KEYWORDS_FOR_LEARNING: 2,
  MAX_CONTENT_LENGTH: 80,
  TRUNCATE_LENGTH: 77,
  MAX_SLICE_LENGTH: 100,
} as const;

export const LEARNING_CONTEXTS = {
  USER_PREFERENCE: "User preference",
  CONVENTION_IDENTIFIED: "Convention identified",
  MULTIPLE_INDICATORS: "Multiple preference indicators",
  CONVENTION_CONFIRMED: "Convention confirmed by assistant",
  PREFERENCE_ACKNOWLEDGED: "Preference acknowledged by assistant",
} as const;

export const CATEGORY_PATTERNS: Record<string, LearningCategory> = {
  prefer: "preference",
  use: "preference",
  directory: "architecture",
  architecture: "architecture",
  style: "style",
  naming: "style",
  indent: "style",
  test: "testing",
};
