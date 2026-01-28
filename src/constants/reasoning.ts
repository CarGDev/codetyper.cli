/**
 * Configuration constants for the Reasoning Control Layer
 * All tunable parameters in one place
 */

import type {
  EntityType,
  MemoryItemType,
  ValidationCheckType,
} from "@/types/reasoning";

// =============================================================================
// QUALITY EVALUATION THRESHOLDS
// =============================================================================

export const QUALITY_THRESHOLDS = {
  ACCEPT: 0.7,
  RETRY: 0.4,
  ESCALATE: 0.2,
} as const;

export const QUALITY_WEIGHTS = {
  structural: 0.3,
  relevance: 0.25,
  completeness: 0.25,
  coherence: 0.2,
} as const;

export const STRUCTURAL_CHECK_WEIGHTS = {
  parseSucceeds: 0.4,
  hasExpectedFormat: 0.3,
  withinLengthBounds: 0.15,
  noMalformedBlocks: 0.15,
} as const;

// =============================================================================
// HALLUCINATION DETECTION PATTERNS
// =============================================================================

export const HALLUCINATION_PATTERNS: RegExp[] = [
  /I don't have access to .* but/i,
  /I cannot .* however/i,
  /assuming .* exists/i,
  /\[placeholder\]/i,
  /TODO:.*implement/i,
  /file:\/\/\/[a-z]:/i,
  /I'll need to .* first, but/i,
  /I'm not able to verify/i,
  /hypothetically/i,
  /in theory/i,
];

export const CONTRADICTION_PATTERNS: RegExp[] = [
  /but actually|actually, no/i,
  /wait,? (?:no|I was wrong)/i,
  /on second thought/i,
  /correction:/i,
  /I misspoke/i,
];

export const INCOMPLETE_STATEMENT_PATTERNS: RegExp[] = [
  /\.{3,}$/,
  /\s+$/,
  /(?:and|or|but|if|when|while)\s*$/i,
];

// =============================================================================
// RETRY POLICY LIMITS
// =============================================================================

export const RETRY_LIMITS = {
  maxTotalAttempts: 12,
  maxPerTier: 2,
  maxTimeMs: 60000,
} as const;

export const RETRY_TIER_ORDER = [
  "INITIAL",
  "RETRY_SAME",
  "RETRY_SIMPLIFIED",
  "RETRY_DECOMPOSED",
  "RETRY_ALTERNATIVE",
  "EXHAUSTED",
] as const;

// =============================================================================
// CONTEXT COMPRESSION SETTINGS
// =============================================================================

export const COMPRESSION_THRESHOLDS = {
  COMPRESS_AT: 0.8,
  MINIMAL_AT: 0.95,
} as const;

export const COMPRESSION_LIMITS = {
  maxToolResultTokens: 1000,
  truncateHeadTokens: 500,
  truncateTailTokens: 500,
  maxCodeBlockLines: 30,
  keepCodeHeadLines: 10,
  keepCodeTailLines: 5,
  maxMessageAge: 10,
  preserveRecentMessages: 3,
} as const;

// =============================================================================
// MEMORY SELECTION SETTINGS
// =============================================================================

export const MEMORY_WEIGHTS = {
  keywordOverlap: 0.25,
  entityOverlap: 0.25,
  recency: 0.2,
  causalLink: 0.15,
  pathOverlap: 0.1,
  typeBonus: 0.05,
} as const;

export const RECENCY_HALF_LIFE_MINUTES = 30;

export const RELEVANCE_THRESHOLD = 0.15;

export const MEMORY_TYPE_BONUSES: Record<MemoryItemType, number> = {
  ERROR: 0.8,
  DECISION: 0.6,
  TOOL_RESULT: 0.4,
  FILE_CONTENT: 0.3,
  CONVERSATION: 0.2,
};

export const MANDATORY_MEMORY_AGE_THRESHOLD = 3;
export const ERROR_MEMORY_AGE_THRESHOLD = 10;

// =============================================================================
// TERMINATION DETECTION SETTINGS
// =============================================================================

export const CONFIDENCE_THRESHOLDS = {
  CONFIRMED_COMPLETE: 0.85,
  POTENTIALLY_COMPLETE: 0.5,
} as const;

export const VALIDATION_TIMEOUT_MS = 60000;
export const VALIDATION_RETRY_COUNT = 1;

export const COMPLETION_SIGNAL_PATTERNS: Array<{
  type: "MODEL_STATEMENT";
  patterns: RegExp[];
  confidence: number;
}> = [
  {
    type: "MODEL_STATEMENT",
    patterns: [
      /^(?:I've|I have) (?:completed|finished|done)/i,
      /^(?:The|Your) (?:task|request|change) (?:is|has been) (?:complete|done)/i,
      /^All (?:changes|modifications) (?:have been|are) (?:made|applied)/i,
      /^(?:Done|Finished|Complete)[.!]?$/i,
      /successfully (?:created|modified|updated|deleted)/i,
    ],
    confidence: 0.3,
  },
];

export const TOOL_SUCCESS_CONFIDENCE = 0.5;
export const OUTPUT_PRESENT_CONFIDENCE = 0.7;
export const NO_PENDING_ACTIONS_CONFIDENCE = 0.4;

export const VALIDATION_CHECK_CONFIGS: Record<
  ValidationCheckType,
  {
    required: boolean;
    timeout: number;
  }
> = {
  FILE_EXISTS: { required: true, timeout: 5000 },
  SYNTAX_VALID: { required: true, timeout: 10000 },
  DIFF_NONEMPTY: { required: true, timeout: 5000 },
  TESTS_PASS: { required: false, timeout: 60000 },
  SCHEMA_VALID: { required: false, timeout: 5000 },
  NO_REGRESSIONS: { required: false, timeout: 30000 },
};

// =============================================================================
// ENTITY EXTRACTION PATTERNS
// =============================================================================

export const ENTITY_PATTERNS: Record<EntityType, RegExp> = {
  FILE: /(?:^|\s|["'`])([\w\-./]+\.[a-z]{1,4})(?:\s|$|:|[()\[\]"'`])/gm,
  FUNCTION: /(?:function|def|fn|func|const|let|var)\s+(\w+)\s*[=(]/g,
  VARIABLE: /(?:const|let|var|val)\s+(\w+)\s*[=:]/g,
  CLASS: /(?:class|struct|interface|type|enum)\s+(\w+)/g,
  URL: /https?:\/\/[^\s<>"']+/g,
  ERROR_CODE: /(?:error|err|E|errno)\s*[:=]?\s*(\d{3,5})/gi,
};

// =============================================================================
// TOKEN ESTIMATION
// =============================================================================

export const TOKENS_PER_CHAR_ESTIMATE = 0.25;
export const DEFAULT_TOKEN_BUDGET = 8000;

// Default max context (used when model is unknown or "auto")
export const DEFAULT_MAX_CONTEXT_TOKENS = 128000;

// Compaction trigger percentage (compact at 80% of context limit)
export const COMPACTION_TRIGGER_PERCENT = 0.8;

// =============================================================================
// PRESERVATION PRIORITIES
// =============================================================================

export const PRESERVATION_PRIORITIES = {
  CONTEXT_FILE: 1.0,
  IMAGE: 1.0,
  RECENT_MESSAGE: 0.8,
  ERROR: 0.7,
  DECISION: 0.6,
  TOOL_RESULT: 0.4,
  OLD_MESSAGE: 0.2,
} as const;

export type PreservationPriority =
  (typeof PRESERVATION_PRIORITIES)[keyof typeof PRESERVATION_PRIORITIES];

// =============================================================================
// TASK DECOMPOSITION PATTERNS
// =============================================================================

export const TASK_SEGMENT_PATTERNS: RegExp[] = [
  /first,?\s+(.+?)\.\s*then,?\s+(.+)/i,
  /(.+?)\s+and\s+(?:also|then)\s+(.+)/i,
  /step\s*\d+[:.]\s*(.+)/gi,
  /\d+[.)]\s*(.+)/gm,
  /[-•]\s*(.+)/gm,
];

// =============================================================================
// EXECUTION PHASE TIMEOUTS
// =============================================================================

export const PHASE_TIMEOUTS: Record<string, number> = {
  CONTEXT_PREPARATION: 5000,
  LLM_INTERACTION: 120000,
  QUALITY_EVALUATION: 1000,
  RETRY_DECISION: 500,
  EXECUTION: 300000,
  TERMINATION_CHECK: 1000,
  VALIDATION: 60000,
};
