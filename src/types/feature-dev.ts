/**
 * Feature-Dev Workflow Types
 *
 * Types for the 7-phase guided development workflow.
 */

/**
 * Feature development phases
 */
export type FeatureDevPhase =
  | "understand" // Clarify requirements
  | "explore" // Find relevant code (parallel agents)
  | "plan" // Design implementation
  | "implement" // Write code
  | "verify" // Run tests
  | "review" // Self-review changes
  | "finalize"; // Commit and cleanup

/**
 * Phase status
 */
export type PhaseStatus =
  | "pending"
  | "in_progress"
  | "awaiting_approval"
  | "approved"
  | "completed"
  | "skipped"
  | "failed";

/**
 * User checkpoint decision
 */
export type CheckpointDecision =
  | "approve"
  | "reject"
  | "modify"
  | "skip"
  | "abort";

/**
 * Exploration result from codebase analysis
 */
export interface ExplorationResult {
  query: string;
  findings: ExplorationFinding[];
  relevantFiles: string[];
  patterns: string[];
  timestamp: number;
}

/**
 * Single finding from exploration
 */
export interface ExplorationFinding {
  type: "file" | "function" | "pattern" | "dependency";
  path: string;
  line?: number;
  description: string;
  relevance: number;
}

/**
 * Implementation plan created during plan phase
 */
export interface ImplementationPlan {
  summary: string;
  steps: ImplementationStep[];
  risks: string[];
  dependencies: string[];
  testStrategy: string;
  estimatedComplexity: "low" | "medium" | "high";
}

/**
 * Single step in implementation plan
 */
export interface ImplementationStep {
  id: string;
  order: number;
  description: string;
  file: string;
  changeType: "create" | "modify" | "delete";
  details: string;
  dependencies: string[];
}

/**
 * File change made during implementation
 */
export interface FileChange {
  path: string;
  changeType: "created" | "modified" | "deleted";
  additions: number;
  deletions: number;
  diff?: string;
}

/**
 * Test result from verification phase
 */
export interface TestResult {
  passed: boolean;
  totalTests: number;
  passedTests: number;
  failedTests: number;
  skippedTests: number;
  coverage?: number;
  failures: TestFailure[];
  duration: number;
}

/**
 * Single test failure
 */
export interface TestFailure {
  testName: string;
  file: string;
  error: string;
  stack?: string;
}

/**
 * Review finding from self-review phase
 */
export interface ReviewFinding {
  type: "issue" | "suggestion" | "question";
  severity: "critical" | "warning" | "info";
  file: string;
  line?: number;
  message: string;
  suggestion?: string;
}

/**
 * User checkpoint for approval
 */
export interface Checkpoint {
  phase: FeatureDevPhase;
  title: string;
  summary: string;
  details: string[];
  requiresApproval: boolean;
  suggestedAction: CheckpointDecision;
}

/**
 * Feature development workflow state
 */
export interface FeatureDevState {
  id: string;
  phase: FeatureDevPhase;
  phaseStatus: PhaseStatus;
  startedAt: number;
  updatedAt: number;

  // Requirements from understand phase
  requirements: string[];
  clarifications: Array<{ question: string; answer: string }>;

  // Results from explore phase
  explorationResults: ExplorationResult[];
  relevantFiles: string[];

  // Plan from plan phase
  plan?: ImplementationPlan;

  // Changes from implement phase
  changes: FileChange[];

  // Results from verify phase
  testResults?: TestResult;

  // Findings from review phase
  reviewFindings: ReviewFinding[];

  // Final status
  commitHash?: string;
  abortReason?: string;

  // Checkpoints history
  checkpoints: Array<{
    checkpoint: Checkpoint;
    decision: CheckpointDecision;
    feedback?: string;
    timestamp: number;
  }>;
}

/**
 * Phase transition request
 */
export interface PhaseTransitionRequest {
  fromPhase: FeatureDevPhase;
  toPhase: FeatureDevPhase;
  reason?: string;
  skipValidation?: boolean;
}

/**
 * Phase execution context
 */
export interface PhaseExecutionContext {
  state: FeatureDevState;
  workingDir: string;
  sessionId: string;
  abortSignal?: AbortSignal;
  onProgress?: (message: string) => void;
  onCheckpoint?: (checkpoint: Checkpoint) => Promise<{
    decision: CheckpointDecision;
    feedback?: string;
  }>;
}

/**
 * Phase execution result
 */
export interface PhaseExecutionResult {
  success: boolean;
  phase: FeatureDevPhase;
  nextPhase?: FeatureDevPhase;
  checkpoint?: Checkpoint;
  error?: string;
  stateUpdates: Partial<FeatureDevState>;
}

/**
 * Workflow configuration
 */
export interface FeatureDevConfig {
  requireCheckpoints: boolean;
  autoRunTests: boolean;
  autoCommit: boolean;
  maxExplorationDepth: number;
  parallelExplorations: number;
}
