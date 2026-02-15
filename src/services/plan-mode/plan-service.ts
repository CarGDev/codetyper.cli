/**
 * Plan Mode Service
 *
 * Manages the plan approval workflow for complex tasks.
 * complex operations require user approval before execution.
 */

import { v4 as uuidv4 } from "uuid";
import type {
  ImplementationPlan,
  PlanStep,
  PlanApprovalCriteria,
  TaskAnalysis,
  TaskComplexity,
} from "@/types/plan-mode";
import { DEFAULT_PLAN_APPROVAL_CRITERIA } from "@/types/plan-mode";

/**
 * Active plans storage
 */
const activePlans = new Map<string, ImplementationPlan>();

/**
 * Plan event callbacks
 */
type PlanEventCallback = (plan: ImplementationPlan) => void;
const planListeners = new Map<string, Set<PlanEventCallback>>();

/**
 * Keywords indicating complexity
 */
const COMPLEXITY_KEYWORDS = {
  critical: [
    "security",
    "authentication",
    "authorization",
    "password",
    "secret",
    "database migration",
    "production",
    "deploy",
  ],
  complex: [
    "refactor",
    "architecture",
    "restructure",
    "redesign",
    "multiple files",
    "system",
    "integration",
  ],
  moderate: ["feature", "component", "service", "api", "endpoint", "module"],
};

/**
 * Analyze a task to determine if it needs plan approval
 */
export const analyzeTask = (
  taskDescription: string,
  criteria: PlanApprovalCriteria = DEFAULT_PLAN_APPROVAL_CRITERIA,
): TaskAnalysis => {
  const lowerTask = taskDescription.toLowerCase();
  const reasons: string[] = [];

  // Check for critical keywords
  const hasCriticalKeyword = COMPLEXITY_KEYWORDS.critical.some((k) =>
    lowerTask.includes(k),
  );
  if (hasCriticalKeyword) {
    reasons.push("Task involves critical/sensitive operations");
  }

  // Check for complex keywords
  const hasComplexKeyword = COMPLEXITY_KEYWORDS.complex.some((k) =>
    lowerTask.includes(k),
  );
  if (hasComplexKeyword) {
    reasons.push("Task involves architectural changes");
  }

  // Check for always-require operations
  const matchesAlwaysRequire = criteria.alwaysRequireFor.some((op) => {
    const opKeywords: Record<string, string[]> = {
      delete: ["delete", "remove", "drop"],
      refactor: ["refactor", "restructure", "rewrite"],
      architecture: ["architecture", "system design", "redesign"],
      security: ["security", "auth", "permission", "access"],
      database: ["database", "migration", "schema"],
      config: ["config", "environment", "settings"],
    };
    return opKeywords[op]?.some((k) => lowerTask.includes(k));
  });
  if (matchesAlwaysRequire) {
    reasons.push("Task matches always-require-approval criteria");
  }

  // Check for skip-approval patterns
  const matchesSkipApproval = criteria.skipApprovalFor.some((op) => {
    const skipPatterns: Record<string, RegExp> = {
      single_file_edit: /^(fix|update|change|modify)\s+(the\s+)?(\w+\.\w+)$/i,
      add_comment: /^add\s+(a\s+)?comment/i,
      fix_typo: /^fix\s+(a\s+)?typo/i,
      format: /^format\s+(the\s+)?(code|file)/i,
    };
    return skipPatterns[op]?.test(taskDescription);
  });

  // Determine complexity
  let complexity: TaskComplexity;
  if (hasCriticalKeyword) {
    complexity = "critical";
  } else if (hasComplexKeyword || matchesAlwaysRequire) {
    complexity = "complex";
  } else if (COMPLEXITY_KEYWORDS.moderate.some((k) => lowerTask.includes(k))) {
    complexity = "moderate";
  } else {
    complexity = "simple";
  }

  // Determine if plan approval is required
  const requiresPlanApproval =
    !matchesSkipApproval &&
    (complexity === "critical" ||
      complexity === "complex" ||
      reasons.length > 0);

  // Suggest approach
  const suggestedApproach = requiresPlanApproval
    ? "Create a detailed implementation plan for user approval before proceeding"
    : "Execute directly with standard verification";

  return {
    complexity,
    requiresPlanApproval,
    reasons,
    suggestedApproach,
  };
};

/**
 * Create a new implementation plan
 */
export const createPlan = (
  title: string,
  summary: string,
): ImplementationPlan => {
  const plan: ImplementationPlan = {
    id: uuidv4(),
    title,
    summary,
    context: {
      filesAnalyzed: [],
      currentArchitecture: "",
      dependencies: [],
    },
    steps: [],
    risks: [],
    testingStrategy: "",
    rollbackPlan: "",
    estimatedChanges: {
      filesCreated: 0,
      filesModified: 0,
      filesDeleted: 0,
    },
    status: "drafting",
    createdAt: Date.now(),
  };

  activePlans.set(plan.id, plan);
  emitPlanEvent(plan.id, plan);

  return plan;
};

/**
 * Add a step to a plan
 */
export const addPlanStep = (
  planId: string,
  step: Omit<PlanStep, "id" | "status">,
): PlanStep | null => {
  const plan = activePlans.get(planId);
  if (!plan || plan.status !== "drafting") {
    return null;
  }

  const newStep: PlanStep = {
    ...step,
    id: uuidv4(),
    status: "pending",
  };

  plan.steps.push(newStep);
  emitPlanEvent(planId, plan);

  return newStep;
};

/**
 * Update plan context
 */
export const updatePlanContext = (
  planId: string,
  context: Partial<ImplementationPlan["context"]>,
): boolean => {
  const plan = activePlans.get(planId);
  if (!plan) {
    return false;
  }

  plan.context = { ...plan.context, ...context };
  emitPlanEvent(planId, plan);

  return true;
};

/**
 * Add a risk to the plan
 */
export const addPlanRisk = (
  planId: string,
  risk: ImplementationPlan["risks"][0],
): boolean => {
  const plan = activePlans.get(planId);
  if (!plan) {
    return false;
  }

  plan.risks.push(risk);
  emitPlanEvent(planId, plan);

  return true;
};

/**
 * Finalize plan and submit for approval
 */
export const submitPlanForApproval = (
  planId: string,
  testingStrategy: string,
  rollbackPlan: string,
): boolean => {
  const plan = activePlans.get(planId);
  if (!plan || plan.status !== "drafting") {
    return false;
  }

  plan.testingStrategy = testingStrategy;
  plan.rollbackPlan = rollbackPlan;
  plan.status = "pending";

  // Calculate estimated changes
  const filesCreated = new Set<string>();
  const filesModified = new Set<string>();
  const filesDeleted = new Set<string>();

  for (const step of plan.steps) {
    for (const file of step.filesAffected) {
      if (
        step.title.toLowerCase().includes("create") ||
        step.title.toLowerCase().includes("add")
      ) {
        filesCreated.add(file);
      } else if (
        step.title.toLowerCase().includes("delete") ||
        step.title.toLowerCase().includes("remove")
      ) {
        filesDeleted.add(file);
      } else {
        filesModified.add(file);
      }
    }
  }

  plan.estimatedChanges = {
    filesCreated: filesCreated.size,
    filesModified: filesModified.size,
    filesDeleted: filesDeleted.size,
  };

  emitPlanEvent(planId, plan);

  return true;
};

/**
 * Approve a plan
 */
export const approvePlan = (planId: string, message?: string): boolean => {
  const plan = activePlans.get(planId);
  if (!plan || plan.status !== "pending") {
    return false;
  }

  plan.status = "approved";
  plan.approvedAt = Date.now();
  plan.approvalMessage = message;

  emitPlanEvent(planId, plan);

  return true;
};

/**
 * Reject a plan
 */
export const rejectPlan = (planId: string, reason: string): boolean => {
  const plan = activePlans.get(planId);
  if (!plan || plan.status !== "pending") {
    return false;
  }

  plan.status = "rejected";
  plan.rejectionReason = reason;

  emitPlanEvent(planId, plan);

  return true;
};

/**
 * Start executing a plan
 */
export const startPlanExecution = (planId: string): boolean => {
  const plan = activePlans.get(planId);
  if (!plan || plan.status !== "approved") {
    return false;
  }

  plan.status = "executing";
  emitPlanEvent(planId, plan);

  return true;
};

/**
 * Update step status during execution
 */
export const updateStepStatus = (
  planId: string,
  stepId: string,
  status: PlanStep["status"],
  output?: string,
  error?: string,
): boolean => {
  const plan = activePlans.get(planId);
  if (!plan) {
    return false;
  }

  const step = plan.steps.find((s) => s.id === stepId);
  if (!step) {
    return false;
  }

  step.status = status;
  if (output) step.output = output;
  if (error) step.error = error;

  emitPlanEvent(planId, plan);

  return true;
};

/**
 * Complete plan execution
 */
export const completePlanExecution = (
  planId: string,
  success: boolean,
): boolean => {
  const plan = activePlans.get(planId);
  if (!plan || plan.status !== "executing") {
    return false;
  }

  plan.status = success ? "completed" : "failed";
  plan.completedAt = Date.now();

  emitPlanEvent(planId, plan);

  return true;
};

/**
 * Get a plan by ID
 */
export const getPlan = (planId: string): ImplementationPlan | undefined => {
  return activePlans.get(planId);
};

/**
 * Get all active plans
 */
export const getActivePlans = (): ImplementationPlan[] => {
  return Array.from(activePlans.values()).filter(
    (p) =>
      p.status !== "completed" &&
      p.status !== "failed" &&
      p.status !== "rejected",
  );
};

/**
 * Risk level display icons
 */
const RISK_ICONS: Record<string, string> = {
  high: "!",
  medium: "~",
  low: " ",
};

/**
 * Format a plan for display (terminal-friendly, no markdown)
 */
export const formatPlanForDisplay = (plan: ImplementationPlan): string => {
  const lines: string[] = [];

  lines.push(`Plan to implement`);
  lines.push("");
  lines.push(plan.title);
  lines.push("");
  lines.push(plan.summary);
  lines.push("");

  if (plan.context.filesAnalyzed.length > 0) {
    lines.push("Files Analyzed");
    plan.context.filesAnalyzed.forEach((f) => lines.push(`  ${f}`));
    lines.push("");
  }

  if (plan.context.currentArchitecture) {
    lines.push("Current Architecture");
    lines.push(`  ${plan.context.currentArchitecture}`);
    lines.push("");
  }

  if (plan.steps.length > 0) {
    lines.push("Implementation Steps");
    plan.steps.forEach((step, i) => {
      const icon = RISK_ICONS[step.riskLevel] ?? " ";
      lines.push(`  ${i + 1}. [${icon}] ${step.title}`);
      lines.push(`     ${step.description}`);
      if (step.filesAffected.length > 0) {
        lines.push(`     Files: ${step.filesAffected.join(", ")}`);
      }
    });
    lines.push("");
  }

  if (plan.risks.length > 0) {
    lines.push("Risks");
    plan.risks.forEach((risk) => {
      lines.push(`  [${risk.impact.toUpperCase()}] ${risk.description}`);
      lines.push(`    Mitigation: ${risk.mitigation}`);
    });
    lines.push("");
  }

  if (plan.testingStrategy) {
    lines.push("Testing Strategy");
    lines.push(`  ${plan.testingStrategy}`);
    lines.push("");
  }

  if (plan.rollbackPlan) {
    lines.push("Rollback Plan");
    lines.push(`  ${plan.rollbackPlan}`);
    lines.push("");
  }

  lines.push("Estimated Changes");
  lines.push(`  Files to create: ${plan.estimatedChanges.filesCreated}`);
  lines.push(`  Files to modify: ${plan.estimatedChanges.filesModified}`);
  lines.push(`  Files to delete: ${plan.estimatedChanges.filesDeleted}`);

  return lines.join("\n");
};

/**
 * Check if a message approves a plan
 */
export const isApprovalMessage = (message: string): boolean => {
  const approvalPatterns = [
    /^(proceed|go\s*ahead|approve|yes|ok|lgtm|looks\s*good|do\s*it|start|execute)$/i,
    /^(sounds\s*good|that\s*works|perfect|great)$/i,
    /proceed\s*with/i,
    /go\s*ahead\s*(with|and)/i,
  ];

  return approvalPatterns.some((p) => p.test(message.trim()));
};

/**
 * Check if a message rejects a plan
 */
export const isRejectionMessage = (message: string): boolean => {
  const rejectionPatterns = [
    /^(stop|cancel|no|abort|don't|wait)$/i,
    /^(hold\s*on|not\s*yet|let\s*me)$/i,
    /don't\s*(proceed|do|execute)/i,
  ];

  return rejectionPatterns.some((p) => p.test(message.trim()));
};

/**
 * Subscribe to plan events
 */
export const subscribeToPlan = (
  planId: string,
  callback: PlanEventCallback,
): (() => void) => {
  if (!planListeners.has(planId)) {
    planListeners.set(planId, new Set());
  }

  planListeners.get(planId)!.add(callback);

  return () => {
    planListeners.get(planId)?.delete(callback);
  };
};

/**
 * Emit a plan event
 */
const emitPlanEvent = (planId: string, plan: ImplementationPlan): void => {
  const listeners = planListeners.get(planId);
  if (listeners) {
    listeners.forEach((callback) => callback(plan));
  }
};

/**
 * Clean up a completed/rejected plan
 */
export const cleanupPlan = (planId: string): void => {
  activePlans.delete(planId);
  planListeners.delete(planId);
};
