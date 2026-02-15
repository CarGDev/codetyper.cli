/**
 * Plan Approval Tool
 *
 * Allows agents to submit implementation plans for user approval.
 */

import { z } from "zod";
import type { ToolDefinition, ToolContext, ToolResult } from "@/types/tools";
import {
  createPlan,
  addPlanStep,
  updatePlanContext,
  addPlanRisk,
  submitPlanForApproval,
  formatPlanForDisplay,
  getPlan,
  analyzeTask,
} from "@services/plan-mode/plan-service";

/**
 * Parameters for the plan approval tool
 */
const planApprovalSchema = z.object({
  action: z
    .enum([
      "create",
      "add_step",
      "add_context",
      "add_risk",
      "submit",
      "check_status",
      "analyze_task",
    ])
    .describe("The action to perform"),

  // For create action
  title: z.string().optional().describe("Title of the implementation plan"),
  summary: z
    .string()
    .optional()
    .describe("Summary of what the plan will accomplish"),

  // For add_step action
  plan_id: z.string().optional().describe("ID of the plan to modify"),
  step_title: z.string().optional().describe("Title of the step"),
  step_description: z
    .string()
    .optional()
    .describe("Description of what this step does"),
  files_affected: z
    .array(z.string())
    .optional()
    .describe("Files that will be affected by this step"),
  risk_level: z
    .enum(["low", "medium", "high"])
    .optional()
    .describe("Risk level of this step"),

  // For add_context action
  files_analyzed: z
    .array(z.string())
    .optional()
    .describe("Files that were analyzed for this plan"),
  current_architecture: z
    .string()
    .optional()
    .describe("Description of current architecture"),
  dependencies: z
    .array(z.string())
    .optional()
    .describe("Dependencies identified"),

  // For add_risk action
  risk_description: z.string().optional().describe("Description of the risk"),
  risk_impact: z
    .enum(["low", "medium", "high"])
    .optional()
    .describe("Impact level of the risk"),
  risk_mitigation: z.string().optional().describe("How to mitigate this risk"),

  // For submit action
  testing_strategy: z
    .string()
    .optional()
    .describe("How the changes will be tested"),
  rollback_plan: z
    .string()
    .optional()
    .describe("How to rollback if something goes wrong"),

  // For analyze_task action
  task_description: z
    .string()
    .optional()
    .describe("The task to analyze for complexity"),
});

type PlanApprovalParams = z.infer<typeof planApprovalSchema>;

/**
 * Execute the plan approval tool
 */
export const executePlanApproval = async (
  params: PlanApprovalParams,
  _ctx: ToolContext,
): Promise<ToolResult> => {
  const actionHandlers: Record<string, () => ToolResult> = {
    create: () => handleCreate(params),
    add_step: () => handleAddStep(params),
    add_context: () => handleAddContext(params),
    add_risk: () => handleAddRisk(params),
    submit: () => handleSubmit(params),
    check_status: () => handleCheckStatus(params),
    analyze_task: () => handleAnalyzeTask(params),
  };

  const handler = actionHandlers[params.action];
  if (!handler) {
    return {
      success: false,
      title: "Unknown action",
      output: "",
      error: `Unknown action: ${params.action}`,
    };
  }

  return handler();
};

/**
 * Handle create action
 */
const handleCreate = (params: PlanApprovalParams): ToolResult => {
  if (!params.title || !params.summary) {
    return {
      success: false,
      title: "Missing parameters",
      output: "",
      error: "Both title and summary are required for create action",
    };
  }

  const plan = createPlan(params.title, params.summary);

  return {
    success: true,
    title: "Plan created",
    output: `Created implementation plan with ID: ${plan.id}\n\nNow add steps, context, and risks before submitting for approval.`,
  };
};

/**
 * Handle add_step action
 */
const handleAddStep = (params: PlanApprovalParams): ToolResult => {
  if (!params.plan_id || !params.step_title || !params.step_description) {
    return {
      success: false,
      title: "Missing parameters",
      output: "",
      error: "plan_id, step_title, and step_description are required",
    };
  }

  const step = addPlanStep(params.plan_id, {
    title: params.step_title,
    description: params.step_description,
    filesAffected: params.files_affected ?? [],
    riskLevel: params.risk_level ?? "low",
  });

  if (!step) {
    return {
      success: false,
      title: "Failed to add step",
      output: "",
      error: "Plan not found or not in drafting status",
    };
  }

  return {
    success: true,
    title: "Step added",
    output: `Added step: ${step.title} (ID: ${step.id})`,
  };
};

/**
 * Handle add_context action
 */
const handleAddContext = (params: PlanApprovalParams): ToolResult => {
  if (!params.plan_id) {
    return {
      success: false,
      title: "Missing parameters",
      output: "",
      error: "plan_id is required",
    };
  }

  const context: Partial<{
    filesAnalyzed: string[];
    currentArchitecture: string;
    dependencies: string[];
  }> = {};

  if (params.files_analyzed) {
    context.filesAnalyzed = params.files_analyzed;
  }
  if (params.current_architecture) {
    context.currentArchitecture = params.current_architecture;
  }
  if (params.dependencies) {
    context.dependencies = params.dependencies;
  }

  const success = updatePlanContext(params.plan_id, context);

  if (!success) {
    return {
      success: false,
      title: "Failed to update context",
      output: "",
      error: "Plan not found",
    };
  }

  return {
    success: true,
    title: "Context updated",
    output: "Plan context has been updated",
  };
};

/**
 * Handle add_risk action
 */
const handleAddRisk = (params: PlanApprovalParams): ToolResult => {
  if (
    !params.plan_id ||
    !params.risk_description ||
    !params.risk_impact ||
    !params.risk_mitigation
  ) {
    return {
      success: false,
      title: "Missing parameters",
      output: "",
      error:
        "plan_id, risk_description, risk_impact, and risk_mitigation are required",
    };
  }

  const success = addPlanRisk(params.plan_id, {
    description: params.risk_description,
    impact: params.risk_impact,
    mitigation: params.risk_mitigation,
  });

  if (!success) {
    return {
      success: false,
      title: "Failed to add risk",
      output: "",
      error: "Plan not found",
    };
  }

  return {
    success: true,
    title: "Risk added",
    output: `Added risk: ${params.risk_description}`,
  };
};

/**
 * Handle submit action
 */
const handleSubmit = (params: PlanApprovalParams): ToolResult => {
  if (!params.plan_id) {
    return {
      success: false,
      title: "Missing parameters",
      output: "",
      error: "plan_id is required",
    };
  }

  const success = submitPlanForApproval(
    params.plan_id,
    params.testing_strategy ?? "Run existing tests and verify changes manually",
    params.rollback_plan ?? "Revert changes using git",
  );

  if (!success) {
    return {
      success: false,
      title: "Failed to submit plan",
      output: "",
      error: "Plan not found or not in drafting status",
    };
  }

  const plan = getPlan(params.plan_id);
  if (!plan) {
    return {
      success: false,
      title: "Plan not found",
      output: "",
      error: "Plan was submitted but could not be retrieved",
    };
  }

  const formattedPlan = formatPlanForDisplay(plan);

  return {
    success: true,
    title: "Plan submitted for approval",
    output: formattedPlan,
    metadata: {
      planId: plan.id,
      planStatus: "pending",
      requiresApproval: true,
    },
  };
};

/**
 * Handle check_status action
 */
const handleCheckStatus = (params: PlanApprovalParams): ToolResult => {
  if (!params.plan_id) {
    return {
      success: false,
      title: "Missing parameters",
      output: "",
      error: "plan_id is required",
    };
  }

  const plan = getPlan(params.plan_id);
  if (!plan) {
    return {
      success: false,
      title: "Plan not found",
      output: "",
      error: `No plan found with ID: ${params.plan_id}`,
    };
  }

  const statusMessages: Record<string, string> = {
    drafting:
      "Plan is being drafted. Add steps, context, and risks, then submit for approval.",
    pending:
      "Plan is awaiting user approval. Wait for the user to approve or provide feedback.",
    approved: "Plan has been approved. You may proceed with implementation.",
    rejected: `Plan was rejected. Reason: ${plan.rejectionReason ?? "No reason provided"}`,
    executing: "Plan is currently being executed.",
    completed: "Plan execution completed successfully.",
    failed: "Plan execution failed.",
  };

  return {
    success: true,
    title: `Plan status: ${plan.status}`,
    output: statusMessages[plan.status] ?? `Unknown status: ${plan.status}`,
    metadata: {
      planId: plan.id,
      planStatus: plan.status,
      stepsCompleted: plan.steps.filter((s) => s.status === "completed").length,
      totalSteps: plan.steps.length,
    },
  };
};

/**
 * Handle analyze_task action
 */
const handleAnalyzeTask = (params: PlanApprovalParams): ToolResult => {
  if (!params.task_description) {
    return {
      success: false,
      title: "Missing parameters",
      output: "",
      error: "task_description is required",
    };
  }

  const analysis = analyzeTask(params.task_description);

  const output = [
    `## Task Analysis`,
    ``,
    `**Complexity**: ${analysis.complexity}`,
    `**Requires Plan Approval**: ${analysis.requiresPlanApproval ? "Yes" : "No"}`,
    ``,
    `**Suggested Approach**: ${analysis.suggestedApproach}`,
  ];

  if (analysis.reasons.length > 0) {
    output.push(``, `**Reasons**:`);
    analysis.reasons.forEach((r) => output.push(`- ${r}`));
  }

  return {
    success: true,
    title: `Task complexity: ${analysis.complexity}`,
    output: output.join("\n"),
    metadata: {
      complexity: analysis.complexity,
      requiresPlanApproval: analysis.requiresPlanApproval,
    },
  };
};

/**
 * Tool definition for plan approval
 */
export const planApprovalTool: ToolDefinition<typeof planApprovalSchema> = {
  name: "plan_approval",
  description: `Submit implementation plans for user approval before executing complex tasks.

Use this tool when:
- Making changes to 3+ files
- Refactoring code
- Architectural changes
- Security-related changes
- Database modifications

Workflow:
1. analyze_task - Check if task needs plan approval
2. create - Create a new plan with title and summary
3. add_context - Add files analyzed, architecture info
4. add_step - Add each implementation step (repeat)
5. add_risk - Add identified risks
6. submit - Submit plan and wait for user approval
7. check_status - Check if user approved

After approval, proceed with implementation. If rejected, address feedback and resubmit.`,
  parameters: planApprovalSchema,
  execute: executePlanApproval,
};
