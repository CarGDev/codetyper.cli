/**
 * Cascade Orchestrator Service
 *
 * Orchestrates the cascading provider flow
 */

import type {
  TaskType,
  RoutingDecision,
  CascadeResult,
  AuditResult,
} from "@/types/provider-quality";
import { PROVIDER_IDS } from "@constants/provider-quality";
import { parseAuditResponse } from "@prompts/audit-prompt";
import {
  detectTaskType,
  determineRoute,
  recordAuditResult,
  recordApproval,
  recordRejection,
} from "@services/provider-quality";
import {
  checkOllamaAvailability,
  checkCopilotAvailability,
} from "./availability";

export interface CascadeCallbacks {
  onRouteDecided?: (decision: RoutingDecision, taskType: TaskType) => void;
  onPrimaryStart?: (provider: string) => void;
  onPrimaryComplete?: (response: string) => void;
  onAuditStart?: () => void;
  onAuditComplete?: (result: AuditResult) => void;
  onCorrectionApplied?: (correctedResponse: string) => void;
}

export interface CascadeOptions {
  cascadeEnabled: boolean;
  callbacks?: CascadeCallbacks;
}

export interface ProviderCallFn {
  (prompt: string, provider: "ollama" | "copilot", isAudit?: boolean): Promise<string>;
}

export const executeCascade = async (
  userPrompt: string,
  callProvider: ProviderCallFn,
  options: CascadeOptions,
): Promise<CascadeResult> => {
  const taskType = detectTaskType(userPrompt);
  const ollamaStatus = await checkOllamaAvailability();
  const copilotStatus = await checkCopilotAvailability();

  const routingDecision = await determineRoute({
    taskType,
    ollamaAvailable: ollamaStatus.available,
    copilotAvailable: copilotStatus.available,
    cascadeEnabled: options.cascadeEnabled,
  });

  options.callbacks?.onRouteDecided?.(routingDecision, taskType);

  if (routingDecision === "copilot_only") {
    options.callbacks?.onPrimaryStart?.("copilot");
    const response = await callProvider(userPrompt, "copilot");
    options.callbacks?.onPrimaryComplete?.(response);

    return {
      primaryResponse: response,
      finalResponse: response,
      routingDecision,
      taskType,
    };
  }

  if (routingDecision === "ollama_only") {
    options.callbacks?.onPrimaryStart?.("ollama");
    const response = await callProvider(userPrompt, "ollama");
    options.callbacks?.onPrimaryComplete?.(response);

    return {
      primaryResponse: response,
      finalResponse: response,
      routingDecision,
      taskType,
    };
  }

  // Cascade mode: Ollama first, then Copilot audit
  options.callbacks?.onPrimaryStart?.("ollama");
  const primaryResponse = await callProvider(userPrompt, "ollama");
  options.callbacks?.onPrimaryComplete?.(primaryResponse);

  options.callbacks?.onAuditStart?.();
  const auditResponse = await callProvider(
    createAuditMessage(userPrompt, primaryResponse),
    "copilot",
    true,
  );

  const auditResult = parseAuditResult(auditResponse);
  options.callbacks?.onAuditComplete?.(auditResult);

  // Update quality scores based on audit
  await recordAuditResult(
    PROVIDER_IDS.OLLAMA,
    taskType,
    auditResult.approved,
    auditResult.severity === "major" || auditResult.severity === "critical",
  );

  // Determine final response
  let finalResponse = primaryResponse;

  if (!auditResult.approved && auditResult.severity !== "none") {
    const parsed = parseAuditResponse(auditResponse);
    if (parsed.correctedResponse) {
      finalResponse = parsed.correctedResponse;
      options.callbacks?.onCorrectionApplied?.(finalResponse);
    }
  }

  return {
    primaryResponse,
    auditResult,
    finalResponse,
    routingDecision,
    taskType,
  };
};

const createAuditMessage = (
  userPrompt: string,
  ollamaResponse: string,
): string => {
  return `Please audit this AI response:

## User Request
${userPrompt}

## AI Response to Audit
${ollamaResponse}

## Instructions
Evaluate the response for correctness, completeness, best practices, and security.
Respond with a JSON object containing: approved (boolean), severity (none/minor/major/critical), issues (array), suggestions (array), and correctedResponse (if needed).`;
};

const parseAuditResult = (auditResponse: string): AuditResult => {
  const parsed = parseAuditResponse(auditResponse);

  return {
    approved: parsed.approved,
    issues: parsed.issues,
    suggestions: parsed.suggestions,
    severity: parsed.severity,
  };
};

export const recordUserFeedback = async (
  taskType: TaskType,
  isPositive: boolean,
  lastProvider: string,
): Promise<void> => {
  if (lastProvider !== PROVIDER_IDS.OLLAMA) {
    return;
  }

  if (isPositive) {
    await recordApproval(PROVIDER_IDS.OLLAMA, taskType);
  } else {
    await recordRejection(PROVIDER_IDS.OLLAMA, taskType);
  }
};
