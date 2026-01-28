/**
 * Reasoning Control Layer - Public API
 *
 * This module provides cognitive control layers that create intelligence
 * through control flow, not prompt engineering.
 *
 * Five cognitive functions:
 * 1. Quality Evaluation - Assess response acceptability
 * 2. Retry Policy - Control retry behavior through state machine
 * 3. Context Compression - Reduce context while preserving information
 * 4. Memory Selection - Select relevant memories for context
 * 5. Termination Detection - Detect task completion through validation
 */

// =============================================================================
// QUALITY EVALUATION
// =============================================================================

export {
  evaluateQuality,
  computeQualityMetrics,
  computeStructuralScore,
  computeRelevanceScore,
  computeCompletenessScore,
  computeCoherenceScore,
  computeVerdict,
  detectDeficiencies,
  hasHallucinationMarkers,
  hasContradiction,
} from "@services/reasoning/quality-evaluation";

// =============================================================================
// RETRY POLICY
// =============================================================================

export {
  createInitialRetryState,
  createRetryBudget,
  computeRetryTransition,
  splitTaskDescription,
  isRetryable,
  getCurrentTier,
  getRemainingAttempts,
  getElapsedTime,
  getRemainingTime,
} from "@services/reasoning/retry-policy";

// =============================================================================
// CONTEXT COMPRESSION
// =============================================================================

export {
  compressContext,
  determineCompressionLevel,
  shouldCompress,
  compressIncrementally,
  calculateMessageAge,
  markMessagesWithAge,
  getPreservationCandidates,
} from "@services/reasoning/context-compression";

// =============================================================================
// MEMORY SELECTION
// =============================================================================

export {
  selectRelevantMemories,
  computeRelevance,
  computeMandatoryItems,
  createMemoryItem,
  createQueryContext,
  createMemoryStore,
  addMemory,
  findMemoriesByType,
  findMemoriesByPath,
  pruneOldMemories,
} from "@services/reasoning/memory-selection";

export { MemoryStore } from "@interfaces/memory";

// =============================================================================
// TERMINATION DETECTION
// =============================================================================

export {
  createInitialTerminationState,
  processTerminationTrigger,
  computeTerminationConfidence,
  runValidationCheck,
  extractValidationFailures,
  isComplete,
  isFailed,
  isTerminal,
  requiresValidation,
  getConfidencePercentage,
} from "@services/reasoning/termination-detection";

export type { ValidationContext } from "@services/reasoning/termination-detection";

// =============================================================================
// ORCHESTRATOR
// =============================================================================

export {
  createOrchestratorConfig,
  createInitialState,
  prepareContext,
  evaluateResponseQuality,
  decideRetry,
  checkTermination,
  executeReasoningCycle,
} from "@services/reasoning/orchestrator";

export type {
  OrchestratorConfig,
  ContextPreparationInput,
  ContextPreparationOutput,
  QualityEvaluationInput,
  RetryDecisionInput,
  RetryDecisionOutput,
  TerminationCheckInput,
  TerminationCheckOutput,
  ExecutionCycleInput,
  ExecutionCycleOutput,
} from "@services/reasoning/orchestrator";

// =============================================================================
// UTILITIES
// =============================================================================

export {
  estimateTokens,
  estimateTokensForObject,
  tokenize,
  jaccardSimilarity,
  weightedSum,
  extractEntities,
  createEntityTable,
  mergeEntityTables,
  truncateMiddle,
  foldCode,
  extractCodeBlocks,
  recencyDecay,
  createTimestamp,
  generateId,
  isValidJson,
  hasBalancedBraces,
  countMatches,
  sum,
  unique,
  groupBy,
} from "@services/reasoning/utils";

// =============================================================================
// RE-EXPORT TYPES
// =============================================================================

export type {
  // Common
  MessageId,
  ToolId,
  MemoryId,
  TaskId,
  Entity,
  EntityType,
  EntityTable,

  // Quality Evaluation
  QualityVerdict,
  DeficiencyTag,
  QualityMetrics,
  QualityEvalInput,
  QualityEvalOutput,
  ResponseType,
  ToolCallInfo,
  TaskConstraints,
  AttemptRecord,

  // Retry Policy
  RetryStateKind,
  ExhaustionReason,
  RetryState,
  RetryBudget,
  RetryPolicyState,
  ContextDelta,
  SubTask,
  RetryTrigger,
  ToolExecutionError,
  RetryTransform,
  RetryAction,
  EscalationContext,
  RetryPolicyInput,
  RetryPolicyOutput,

  // Context Compression
  CompressionLevel,
  CompressibleMessage,
  MessageMetadata,
  CompressibleToolResult,
  CodeBlock,
  CompressionTrigger,
  CompressionInput,
  CompressionOutput,

  // Memory Selection
  MemoryItemType,
  MemoryItem,
  QueryContext,
  RelevanceScore,
  RelevanceBreakdown,
  SelectionInput,
  ExclusionReason,
  SelectionOutput,

  // Termination Detection
  TerminationStatus,
  CompletionSignalSource,
  CompletionSignal,
  ValidationCheckType,
  ValidationCheck,
  ValidationResult,
  ValidationFailure,
  TerminationState,
  TerminationTrigger,
  TerminationDecision,
  TerminationOutput,
  TerminationEvidence,

  // Orchestrator
  ReasoningControlState,
  ExecutionPhase,
  ExecutionMetrics,
  ReasoningTaskResult,
} from "@/types/reasoning";
