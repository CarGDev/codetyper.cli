/**
 * Core types for the Reasoning Control Layer
 * Provides type definitions for all 5 cognitive control layers
 */

/* eslint-disable @typescript-eslint/no-unused-vars */

// =============================================================================
// COMMON TYPES
// =============================================================================

export type MessageId = string;
export type ToolId = string;
export type MemoryId = string;
export type TaskId = string;

export interface Entity {
  type: EntityType;
  value: string;
  sourceMessageId: MessageId;
  frequency: number;
}

export type EntityType =
  | "FILE"
  | "FUNCTION"
  | "VARIABLE"
  | "CLASS"
  | "URL"
  | "ERROR_CODE";

export interface EntityTable {
  entities: Entity[];
  byType: Record<EntityType, Entity[]>;
  bySource: Record<MessageId, Entity[]>;
}

// =============================================================================
// QUALITY EVALUATION TYPES
// =============================================================================

export type QualityVerdict = "ACCEPT" | "RETRY" | "ESCALATE" | "ABORT";

export type DeficiencyTag =
  | "PARSE_FAILURE"
  | "MISSING_TOOL_CALL"
  | "EMPTY_RESPONSE"
  | "QUERY_MISMATCH"
  | "TRUNCATED"
  | "SELF_CONTRADICTION"
  | "HALLUCINATION_MARKER"
  | "INCOMPLETE_CODE"
  | "WRONG_LANGUAGE"
  | "MISSING_REQUIRED_OUTPUT"
  | "MALFORMED_TOOL_CALL";

export interface QualityMetrics {
  structural: number;
  relevance: number;
  completeness: number;
  coherence: number;
}

export interface QualityEvalInput {
  responseText: string;
  responseToolCalls: ToolCallInfo[];
  expectedType: ResponseType;
  queryTokens: string[];
  queryEntities: Entity[];
  previousAttempts: AttemptRecord[];
  taskConstraints: TaskConstraints;
}

export interface QualityEvalOutput {
  score: number;
  verdict: QualityVerdict;
  deficiencies: DeficiencyTag[];
  metrics: QualityMetrics;
}

export type ResponseType = "tool_call" | "text" | "code" | "mixed";

export interface ToolCallInfo {
  id: string;
  name: string;
  arguments: Record<string, unknown>;
}

export interface TaskConstraints {
  requiredOutputs: string[];
  expectedToolCalls: string[];
  maxResponseTokens: number;
  requiresCode: boolean;
  codeLanguage?: string;
}

export interface AttemptRecord {
  attemptNumber: number;
  timestamp: number;
  verdict: QualityVerdict;
  deficiencies: DeficiencyTag[];
  score: number;
  transformApplied?: string;
}

// =============================================================================
// RETRY POLICY TYPES
// =============================================================================

export type RetryStateKind =
  | "INITIAL"
  | "RETRY_SAME"
  | "RETRY_SIMPLIFIED"
  | "RETRY_DECOMPOSED"
  | "RETRY_ALTERNATIVE"
  | "EXHAUSTED"
  | "COMPLETE";

export type ExhaustionReason =
  | "MAX_TIERS_EXCEEDED"
  | "MAX_ATTEMPTS_EXCEEDED"
  | "TIME_BUDGET_EXCEEDED"
  | "UNRECOVERABLE_ERROR";

export interface RetryState {
  kind: RetryStateKind;
  attempts: number;
  tierAttempts: number;
  removedContext?: ContextDelta;
  subTasks?: SubTask[];
  alternativeTool?: ToolId;
  exhaustionReason?: ExhaustionReason;
}

export interface RetryBudget {
  maxTotalAttempts: number;
  maxPerTier: number;
  maxTimeMs: number;
  startTime: number;
}

export interface RetryPolicyState {
  currentState: RetryState;
  totalAttempts: number;
  history: AttemptRecord[];
  budget: RetryBudget;
}

export interface ContextDelta {
  removedMessageIds: MessageId[];
  truncatedResults: MessageId[];
  collapsedAttempts: number;
}

export interface SubTask {
  id: TaskId;
  description: string;
  dependencies: TaskId[];
  status: "PENDING" | "IN_PROGRESS" | "COMPLETED" | "FAILED";
}

export type RetryTrigger =
  | {
      event: "QUALITY_VERDICT";
      verdict: QualityVerdict;
      deficiencies: DeficiencyTag[];
    }
  | { event: "TOOL_EXECUTION_FAILED"; error: ToolExecutionError }
  | { event: "VALIDATION_FAILED"; failures: ValidationFailure[] };

export interface ToolExecutionError {
  toolName: string;
  errorType:
    | "TIMEOUT"
    | "PERMISSION_DENIED"
    | "INVALID_ARGS"
    | "EXECUTION_ERROR";
  message: string;
}

export type RetryTransform =
  | { kind: "NONE" }
  | { kind: "REDUCE_CONTEXT"; delta: ContextDelta }
  | { kind: "SPLIT_TASK"; subTasks: SubTask[] }
  | { kind: "SELECT_ALTERNATIVE"; tool: ToolId };

export type RetryAction =
  | { kind: "RETRY"; transform: RetryTransform }
  | { kind: "DECOMPOSE"; subTasks: SubTask[] }
  | { kind: "SWITCH_TOOL"; newTool: ToolId }
  | { kind: "ABORT"; reason: string }
  | { kind: "ESCALATE_TO_USER"; context: EscalationContext };

export interface EscalationContext {
  reason: string;
  attempts: AttemptRecord[];
  suggestedActions: string[];
}

export interface RetryPolicyInput {
  currentState: RetryPolicyState;
  trigger: RetryTrigger;
  availableTools: string[];
  contextBudget: number;
}

export interface RetryPolicyOutput {
  nextState: RetryPolicyState;
  action: RetryAction;
}

// =============================================================================
// CONTEXT COMPRESSION TYPES
// =============================================================================

export type CompressionLevel = "FULL" | "COMPRESSED" | "MINIMAL";

export interface CompressibleMessage {
  id: MessageId;
  role: "user" | "assistant" | "tool" | "system";
  content: string;
  tokenCount: number;
  age: number;
  isPreserved: boolean;
  isContextFile?: boolean;
  isImage?: boolean;
  metadata?: MessageMetadata;
}

export interface MessageMetadata {
  attemptFailed?: boolean;
  failureReason?: string;
  isSuperseded?: boolean;
  containsCode?: boolean;
  toolCallId?: string;
}

export interface CompressibleToolResult {
  id: MessageId;
  toolName: string;
  content: string;
  tokenCount: number;
  success: boolean;
}

export interface CodeBlock {
  id: string;
  language: string;
  content: string;
  lineCount: number;
  sourceMessageId: MessageId;
}

export type CompressionTrigger =
  | { event: "TOKEN_THRESHOLD_EXCEEDED"; usage: number; limit: number }
  | { event: "RETRY_POLICY_REQUEST"; reduction: "REDUCE_CONTEXT" }
  | { event: "EXPLICIT_COMPRESSION_REQUEST" };

export interface CompressionInput {
  messages: CompressibleMessage[];
  toolResults: CompressibleToolResult[];
  entities: EntityTable;
  currentTokenCount: number;
  tokenLimit: number;
  preserveList: MessageId[];
}

export interface CompressionOutput {
  compressedMessages: CompressibleMessage[];
  entityTable: EntityTable;
  tokensSaved: number;
  compressionRatio: number;
  appliedRules: string[];
}

// =============================================================================
// MEMORY SELECTION TYPES
// =============================================================================

export type MemoryItemType =
  | "CONVERSATION"
  | "TOOL_RESULT"
  | "FILE_CONTENT"
  | "ERROR"
  | "DECISION";

export interface MemoryItem {
  id: MemoryId;
  content: string;
  tokens: string[];
  entities: Entity[];
  timestamp: number;
  type: MemoryItemType;
  causalLinks: MemoryId[];
  tokenCount: number;
  filePaths?: string[];
}

export interface QueryContext {
  tokens: string[];
  entities: Entity[];
  timestamp: number;
  activeItems: MemoryId[];
  activePaths: string[];
}

export interface RelevanceScore {
  total: number;
  breakdown: RelevanceBreakdown;
}

export interface RelevanceBreakdown {
  keywordOverlap: number;
  entityOverlap: number;
  recency: number;
  causalLink: number;
  pathOverlap: number;
  typeBonus: number;
}

export interface SelectionInput {
  memories: MemoryItem[];
  query: QueryContext;
  tokenBudget: number;
  mandatoryItems: MemoryId[];
}

export type ExclusionReason =
  | "LOW_RELEVANCE"
  | "TOKEN_BUDGET_EXCEEDED"
  | "DUPLICATE"
  | "STALE";

export interface SelectionOutput {
  selected: MemoryItem[];
  scores: Map<MemoryId, RelevanceScore>;
  tokenUsage: number;
  excluded: Array<{ id: MemoryId; reason: ExclusionReason }>;
}

// =============================================================================
// TERMINATION DETECTION TYPES
// =============================================================================

export type TerminationStatus =
  | "RUNNING"
  | "POTENTIALLY_COMPLETE"
  | "AWAITING_VALIDATION"
  | "CONFIRMED_COMPLETE"
  | "FAILED";

export type CompletionSignalSource =
  | "MODEL_STATEMENT"
  | "TOOL_SUCCESS"
  | "OUTPUT_PRESENT"
  | "USER_ACCEPT"
  | "NO_PENDING_ACTIONS";

export interface CompletionSignal {
  source: CompletionSignalSource;
  timestamp: number;
  confidence: number;
  evidence?: string;
}

export type ValidationCheckType =
  | "FILE_EXISTS"
  | "SYNTAX_VALID"
  | "TESTS_PASS"
  | "SCHEMA_VALID"
  | "DIFF_NONEMPTY"
  | "NO_REGRESSIONS";

export interface ValidationCheck {
  id: string;
  type: ValidationCheckType;
  required: boolean;
  timeout: number;
}

export interface ValidationResult {
  checkId: string;
  passed: boolean;
  details: string;
  duration: number;
}

export interface ValidationFailure {
  checkId: string;
  reason: string;
  recoverable: boolean;
}

export interface TerminationState {
  status: TerminationStatus;
  validationResults: ValidationResult[];
  completionSignals: CompletionSignal[];
  confidenceScore: number;
  pendingChecks: ValidationCheck[];
}

export type TerminationTrigger =
  | { event: "MODEL_OUTPUT"; content: string; hasToolCalls: boolean }
  | { event: "TOOL_COMPLETED"; toolName: string; success: boolean }
  | { event: "VALIDATION_RESULT"; result: ValidationResult }
  | { event: "USER_INPUT"; isAcceptance: boolean };

export type TerminationDecision =
  | { kind: "CONTINUE"; reason: string }
  | { kind: "VALIDATE"; checks: ValidationCheck[] }
  | { kind: "COMPLETE"; summary: string }
  | { kind: "FAIL"; reason: string; recoverable: boolean };

export interface TerminationOutput {
  status: TerminationStatus;
  confidence: number;
  decision: TerminationDecision;
  evidence: TerminationEvidence;
}

export interface TerminationEvidence {
  signals: CompletionSignal[];
  validationResults: ValidationResult[];
  pendingItems: string[];
}

// =============================================================================
// ORCHESTRATOR TYPES
// =============================================================================

export interface ReasoningControlState {
  retryPolicy: RetryPolicyState;
  termination: TerminationState;
  compressionLevel: CompressionLevel;
  entityTable: EntityTable;
  currentPhase: ExecutionPhase;
  metrics: ExecutionMetrics;
}

export type ExecutionPhase =
  | "CONTEXT_PREPARATION"
  | "LLM_INTERACTION"
  | "QUALITY_EVALUATION"
  | "RETRY_DECISION"
  | "EXECUTION"
  | "TERMINATION_CHECK"
  | "VALIDATION"
  | "COMPLETE"
  | "FAILED";

export interface ExecutionMetrics {
  totalLLMCalls: number;
  totalToolExecutions: number;
  totalRetries: number;
  totalTokensUsed: number;
  startTime: number;
  phaseTimings: Record<ExecutionPhase, number>;
}

export interface ReasoningTaskResult {
  status: "COMPLETE" | "FAILED" | "ESCALATED";
  confidence: number;
  outputs: string[];
  finalResponse: string;
  metrics: ExecutionMetrics;
  history: AttemptRecord[];
}
