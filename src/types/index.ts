/**
 * TypeScript type definitions for CodeTyper CLI
 */

export type AgentType = "coder" | "tester" | "refactorer" | "documenter";

// Re-export image types
export type {
  ImageMediaType,
  ImageContent,
  TextContent,
  MessageContent,
  MultimodalMessage,
  PastedImage,
} from "@/types/image";

export {
  isImageContent,
  isTextContent,
  createTextContent,
  createImageContent,
} from "@/types/image";

// Re-export brain types
export type {
  BrainUser,
  BrainCredentials,
  BrainConnectionStatus,
  BrainState,
  BrainConcept,
  BrainMemory,
  BrainMemoryType,
  BrainRelationType,
  BrainRecallResponse,
  BrainExtractResponse,
  BrainKnowledgeStats,
  BrainMemoryStats,
} from "@/types/brain";

// Re-export brain cloud sync types
export type {
  BrainSyncStatus,
  ConflictStrategy,
  SyncDirection,
  SyncOperationType,
  BrainSyncState,
  CloudBrainConfig,
  SyncItem,
  SyncConflict,
  SyncResult,
  PushRequest,
  PushResponse,
  PullRequest,
  PullResponse,
  OfflineQueueItem,
  OfflineQueueState,
  SyncProgressEvent,
  SyncOptions,
} from "@/types/brain-cloud";

// Re-export skills types
export type {
  SkillLoadLevel,
  SkillTriggerType,
  SkillExample,
  SkillMetadata,
  SkillBody,
  SkillDefinition,
  SkillMatch,
  SkillContext,
  SkillExecutionResult,
  SkillRegistryState,
  SkillFrontmatter,
  ParsedSkillFile,
} from "@/types/skills";

// Re-export parallel execution types
export type {
  ParallelTaskType,
  TaskPriority,
  ParallelTaskStatus,
  ParallelAgentConfig,
  ParallelTask,
  ParallelExecutionResult,
  ConflictCheckResult,
  ConflictResolution,
  ResourceLimits,
  ResourceState,
  AggregatedResults,
  ParallelExecutorOptions,
  BatchExecutionRequest,
  SemaphoreState,
  DeduplicationKey,
  DeduplicationResult,
} from "@/types/parallel";

// Re-export apply-patch types
export type {
  PatchLineType,
  PatchLine,
  PatchHunk,
  ParsedFilePatch,
  ParsedPatch,
  FuzzyMatchResult,
  HunkApplicationResult,
  FilePatchResult,
  ApplyPatchResult,
  ApplyPatchParams,
  PatchRollback,
  PatchValidationResult,
  ContextMatchOptions,
} from "@/types/apply-patch";

// Re-export feature-dev types
export type {
  FeatureDevPhase,
  PhaseStatus,
  CheckpointDecision,
  ExplorationResult,
  ExplorationFinding,
  ImplementationPlan,
  ImplementationStep,
  FileChange,
  TestResult,
  TestFailure,
  ReviewFinding,
  Checkpoint,
  FeatureDevState,
  PhaseTransitionRequest,
  PhaseExecutionContext,
  PhaseExecutionResult,
  FeatureDevConfig,
} from "@/types/feature-dev";

// Re-export pr-review types
export type {
  ReviewFindingType,
  ReviewSeverity,
  ConfidenceLevel,
  PRReviewFinding,
  DiffHunk,
  ParsedFileDiff,
  ParsedDiff,
  ReviewerConfig,
  SecurityReviewCriteria,
  PerformanceReviewCriteria,
  StyleReviewCriteria,
  LogicReviewCriteria,
  PRReviewConfig,
  ReviewerResult,
  ReviewRating,
  ReviewRecommendation,
  PRReviewReport,
  PRReviewRequest,
  ReviewFileContext,
} from "@/types/pr-review";

export type IntentType =
  | "ask"
  | "code"
  | "refactor"
  | "fix"
  | "document"
  | "test"
  | "explain";

export type Provider = "copilot" | "ollama";

export interface Config {
  provider: Provider;
  model?: string;
  theme?: string;
  maxIterations: number;
  timeout: number;
  protectedPaths: string[];
  systemPrompt?: string;
  cascadeEnabled?: boolean;
}

export interface IntentRequest {
  prompt: string;
  context?: string;
  files?: string[];
}

export interface IntentResponse {
  intent: IntentType;
  confidence: number;
  reasoning: string;
  needsClarification: boolean;
  clarificationQuestions?: string[];
}

export interface PlanStep {
  id: string;
  type: "read" | "edit" | "create" | "delete" | "execute";
  description: string;
  file?: string;
  dependencies?: string[];
  tool?: string;
  args?: Record<string, unknown>;
}

export interface ExecutionPlan {
  steps: PlanStep[];
  intent: IntentType;
  summary: string;
  estimatedTime?: number;
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  protectedPaths: string[];
}

export interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: number;
}

export interface ChatSession {
  id: string;
  agent: AgentType;
  messages: ChatMessage[];
  contextFiles: string[];
  createdAt: number;
  updatedAt: number;
}

export interface CommandOptions {
  agent?: AgentType;
  model?: string;
  files?: string[];
  dryRun?: boolean;
  maxIterations?: number;
  autoApprove?: boolean;
  task?: string;
  prompt?: string;
  context?: string;
  intent?: IntentType;
  output?: string;
  planFile?: string;
  action?: string;
  key?: string;
  value?: string;
}

export interface ToolResult {
  success: boolean;
  output?: string;
  error?: string;
  files?: string[];
}

export interface FileEdit {
  file: string;
  search: string;
  replace: string;
  description?: string;
}

export interface TerminalSpinner {
  start(text: string): void;
  succeed(text: string): void;
  fail(text: string): void;
  stop(): void;
}

// Re-export confidence filter types
export type {
  ConfidenceLevel as ConfidenceFilterLevel,
  ConfidenceScore,
  ConfidenceFactor,
  ConfidenceFilterConfig,
  FilteredResult,
  ValidationResult as ConfidenceValidationResult,
  ConfidenceFilterStats,
} from "@/types/confidence-filter";

export {
  CONFIDENCE_LEVELS,
  DEFAULT_CONFIDENCE_FILTER_CONFIG,
} from "@/types/confidence-filter";

// Re-export agent definition types
export type {
  AgentTier,
  AgentColor,
  AgentDefinition,
  AgentPermissions,
  AgentDefinitionFile,
  AgentFrontmatter,
  AgentRegistry,
  AgentLoadResult,
} from "@/types/agent-definition";

export {
  DEFAULT_AGENT_DEFINITION,
  AGENT_TIER_MODELS,
  AGENT_DEFINITION_SCHEMA,
} from "@/types/agent-definition";

// Re-export background task types
export type {
  BackgroundTaskStatus,
  BackgroundTaskPriority,
  BackgroundTask,
  TaskProgress,
  TaskResult,
  TaskError,
  TaskMetadata,
  TaskNotification,
  TaskStep,
  TaskArtifact,
  BackgroundTaskConfig,
  BackgroundTaskStore,
} from "@/types/background-task";

export {
  DEFAULT_BACKGROUND_TASK_CONFIG,
  BACKGROUND_TASK_PRIORITIES,
} from "@/types/background-task";

// Re-export brain project types
export type {
  BrainProject,
  BrainProjectStats,
  BrainProjectSettings,
  BrainProjectCreateInput,
  BrainProjectUpdateInput,
  BrainProjectSwitchResult,
  BrainProjectListResult,
  BrainProjectExport,
  BrainProjectImportResult,
  ExportedConcept,
  ExportedMemory,
  ExportedRelationship,
} from "@/types/brain-project";

export {
  DEFAULT_BRAIN_PROJECT_SETTINGS,
  BRAIN_PROJECT_EXPORT_VERSION,
} from "@/types/brain-project";

// Re-export brain MCP types
export type {
  BrainMcpToolName,
  BrainMcpServerConfig,
  RateLimitConfig,
  LoggingConfig,
  BrainMcpTool,
  McpInputSchema,
  McpPropertySchema,
  BrainMcpRequest,
  BrainMcpResponse,
  McpContent,
  McpResource,
  McpError,
  BrainMcpServerStatus,
} from "@/types/brain-mcp";

export {
  DEFAULT_BRAIN_MCP_SERVER_CONFIG,
  BRAIN_MCP_TOOLS,
  MCP_ERROR_CODES,
} from "@/types/brain-mcp";
