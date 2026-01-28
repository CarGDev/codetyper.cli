import type { TaskType } from "@/types/provider-quality";

export const QUALITY_THRESHOLDS = {
  HIGH: 0.85,
  MEDIUM: 0.6,
  LOW: 0.4,
  INITIAL: 0.5,
} as const;

export const SCORE_ADJUSTMENTS = {
  APPROVAL: 0.05,
  CORRECTION: -0.08,
  USER_REJECTION: -0.15,
  MINOR_ISSUE: -0.02,
  MAJOR_ISSUE: -0.05,
} as const;

export const TASK_TYPE_PATTERNS: Record<TaskType, RegExp[]> = {
  code_generation: [
    /create\s+(a\s+)?function/i,
    /write\s+(a\s+)?code/i,
    /implement/i,
    /generate\s+(a\s+)?/i,
    /add\s+(a\s+)?(new\s+)?feature/i,
    /build\s+(a\s+)?/i,
  ],
  refactoring: [
    /refactor/i,
    /clean\s*up/i,
    /restructure/i,
    /reorganize/i,
    /simplify/i,
    /improve\s+(the\s+)?code/i,
  ],
  bug_fix: [
    /fix/i,
    /bug/i,
    /error/i,
    /issue/i,
    /not\s+working/i,
    /broken/i,
    /problem/i,
    /debug/i,
  ],
  documentation: [
    /document/i,
    /comment/i,
    /readme/i,
    /explain\s+.*\s+code/i,
    /add\s+.*\s+docs/i,
    /jsdoc/i,
    /tsdoc/i,
  ],
  testing: [
    /test/i,
    /spec/i,
    /unit\s+test/i,
    /integration/i,
    /coverage/i,
    /mock/i,
  ],
  explanation: [
    /explain/i,
    /what\s+(does|is)/i,
    /how\s+(does|do)/i,
    /why/i,
    /understand/i,
    /clarify/i,
  ],
  review: [
    /review/i,
    /check/i,
    /evaluate/i,
    /assess/i,
    /audit/i,
    /pr\s+review/i,
  ],
  general: [],
};

export const NEGATIVE_FEEDBACK_PATTERNS = [
  /fix\s+this/i,
  /that'?s?\s+(wrong|incorrect)/i,
  /not\s+(good|right|correct|working)/i,
  /doesn'?t?\s+work/i,
  /incorrect/i,
  /broken/i,
  /bad\s+(code|response)/i,
  /try\s+again/i,
  /redo/i,
  /wrong/i,
];

export const POSITIVE_FEEDBACK_PATTERNS = [
  /thanks/i,
  /thank\s+you/i,
  /perfect/i,
  /great/i,
  /works/i,
  /good\s+(job|work)/i,
  /excellent/i,
  /awesome/i,
  /exactly/i,
];

export const DEFAULT_QUALITY_SCORES: Record<TaskType, number> = {
  code_generation: QUALITY_THRESHOLDS.INITIAL,
  refactoring: QUALITY_THRESHOLDS.INITIAL,
  bug_fix: QUALITY_THRESHOLDS.INITIAL,
  documentation: QUALITY_THRESHOLDS.INITIAL,
  testing: QUALITY_THRESHOLDS.INITIAL,
  explanation: QUALITY_THRESHOLDS.INITIAL,
  review: QUALITY_THRESHOLDS.INITIAL,
  general: QUALITY_THRESHOLDS.INITIAL,
};

export const PROVIDER_IDS = {
  OLLAMA: "ollama",
  COPILOT: "copilot",
} as const;

export const CASCADE_CONFIG = {
  MIN_AUDIT_THRESHOLD: QUALITY_THRESHOLDS.HIGH,
  MAX_SKIP_THRESHOLD: QUALITY_THRESHOLDS.LOW,
  DECAY_RATE: 0.01,
  DECAY_INTERVAL_MS: 7 * 24 * 60 * 60 * 1000, // 1 week
} as const;
