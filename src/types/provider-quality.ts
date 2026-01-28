export type TaskType =
  | "code_generation"
  | "refactoring"
  | "bug_fix"
  | "documentation"
  | "testing"
  | "explanation"
  | "review"
  | "general";

export interface QualityScore {
  taskType: TaskType;
  successCount: number;
  correctionCount: number;
  userRejectionCount: number;
  lastUpdated: number;
}

export interface ProviderQualityData {
  providerId: string;
  scores: Record<TaskType, QualityScore>;
  overallScore: number;
}

export type RoutingDecision = "ollama_only" | "copilot_only" | "cascade";

export interface AuditResult {
  approved: boolean;
  issues: string[];
  suggestions: string[];
  severity: "none" | "minor" | "major" | "critical";
}

export interface CascadeResult {
  primaryResponse: string;
  auditResult?: AuditResult;
  finalResponse: string;
  routingDecision: RoutingDecision;
  taskType: TaskType;
}
