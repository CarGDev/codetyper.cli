/**
 * Plan Mode Types
 *
 * Types for the plan approval workflow that gates complex operations.
 */

/**
 * Plan status
 */
export type PlanStatus =
  | "drafting"      // Plan is being created
  | "pending"       // Plan submitted, awaiting approval
  | "approved"      // User approved the plan
  | "rejected"      // User rejected the plan
  | "executing"     // Plan is being executed
  | "completed"     // Plan execution completed
  | "failed";       // Plan execution failed

/**
 * A single step in the plan
 */
export interface PlanStep {
  id: string;
  title: string;
  description: string;
  filesAffected: string[];
  riskLevel: "low" | "medium" | "high";
  status: "pending" | "in_progress" | "completed" | "failed" | "skipped";
  output?: string;
  error?: string;
}

/**
 * A complete implementation plan
 */
export interface ImplementationPlan {
  id: string;
  title: string;
  summary: string;
  context: {
    filesAnalyzed: string[];
    currentArchitecture: string;
    dependencies: string[];
  };
  steps: PlanStep[];
  risks: Array<{
    description: string;
    impact: "low" | "medium" | "high";
    mitigation: string;
  }>;
  testingStrategy: string;
  rollbackPlan: string;
  estimatedChanges: {
    filesCreated: number;
    filesModified: number;
    filesDeleted: number;
  };
  status: PlanStatus;
  createdAt: number;
  approvedAt?: number;
  completedAt?: number;
  approvalMessage?: string;
  rejectionReason?: string;
}

/**
 * Plan approval request
 */
export interface PlanApprovalRequest {
  plan: ImplementationPlan;
  autoApproveSimple?: boolean;
  timeout?: number;
}

/**
 * Plan approval response
 */
export interface PlanApprovalResponse {
  approved: boolean;
  message?: string;
  modifiedPlan?: ImplementationPlan;
}

/**
 * Criteria for determining if a task needs plan approval
 */
export interface PlanApprovalCriteria {
  /** Minimum number of files affected to require approval */
  minFilesAffected: number;
  /** Minimum number of steps to require approval */
  minSteps: number;
  /** Always require approval for these operations */
  alwaysRequireFor: Array<
    | "delete"
    | "refactor"
    | "architecture"
    | "security"
    | "database"
    | "config"
  >;
  /** Skip approval for these simple operations */
  skipApprovalFor: Array<
    | "single_file_edit"
    | "add_comment"
    | "fix_typo"
    | "format"
  >;
}

/**
 * Default criteria for plan approval
 */
export const DEFAULT_PLAN_APPROVAL_CRITERIA: PlanApprovalCriteria = {
  minFilesAffected: 3,
  minSteps: 5,
  alwaysRequireFor: ["delete", "refactor", "architecture", "security", "database"],
  skipApprovalFor: ["single_file_edit", "add_comment", "fix_typo", "format"],
};

/**
 * Task complexity levels
 */
export type TaskComplexity = "simple" | "moderate" | "complex" | "critical";

/**
 * Task analysis result
 */
export interface TaskAnalysis {
  complexity: TaskComplexity;
  requiresPlanApproval: boolean;
  reasons: string[];
  suggestedApproach: string;
}
