/**
 * Chat TUI plan approval handling
 *
 * Follows the same pattern as permissions.ts:
 * Creates a blocking promise that resolves when the user responds
 * to the plan approval modal.
 */

import { v4 as uuidv4 } from "uuid";

import type { PlanApprovalPromptResponse } from "@/types/tui";
import type { ImplementationPlan } from "@/types/plan-mode";
import { appStore } from "@tui-solid/context/app";
import { formatPlanForDisplay } from "@services/plan-mode/plan-service";

export interface PlanApprovalHandlerRequest {
  plan: ImplementationPlan;
  planFilePath?: string;
}

export type PlanApprovalHandler = (
  request: PlanApprovalHandlerRequest,
) => Promise<PlanApprovalPromptResponse>;

let planApprovalHandler: PlanApprovalHandler | null = null;

export const setPlanApprovalHandler = (
  handler: PlanApprovalHandler | null,
): void => {
  planApprovalHandler = handler;
};

export const getPlanApprovalHandler = (): PlanApprovalHandler | null =>
  planApprovalHandler;

export const createPlanApprovalHandler = (): PlanApprovalHandler => {
  return (
    request: PlanApprovalHandlerRequest,
  ): Promise<PlanApprovalPromptResponse> => {
    return new Promise((resolve) => {
      appStore.setMode("plan_approval");

      appStore.setPlanApprovalPrompt({
        id: uuidv4(),
        planTitle: request.plan.title,
        planSummary: request.plan.summary,
        planContent: formatPlanForDisplay(request.plan),
        planFilePath: request.planFilePath,
        resolve: (response) => {
          appStore.setPlanApprovalPrompt(null);
          appStore.setMode("thinking");
          resolve(response);
        },
      });
    });
  };
};

export const setupPlanApprovalHandler = (): void => {
  setPlanApprovalHandler(createPlanApprovalHandler());
};

export const cleanupPlanApprovalHandler = (): void => {
  setPlanApprovalHandler(null);
};
