/**
 * Copilot provider utility functions
 */

import {
  COPILOT_INITIAL_RETRY_DELAY,
  CONNECTION_ERROR_PATTERNS,
} from "@constants/copilot";

export const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

export const isConnectionError = (error: unknown): boolean => {
  const message = error instanceof Error ? error.message : String(error);
  return CONNECTION_ERROR_PATTERNS.some((pattern) => pattern.test(message));
};

export const isRateLimitError = (error: unknown): boolean => {
  if (error && typeof error === "object" && "response" in error) {
    const response = (error as { response?: { statusCode?: number } }).response;
    return response?.statusCode === 429;
  }
  return false;
};

interface ErrorResponse {
  response?: {
    statusCode?: number;
    body?: string | { error?: { message?: string; code?: string } };
  };
  message?: string;
}

const QUOTA_EXCEEDED_PATTERNS = [
  /quota/i,
  /limit.*exceeded/i,
  /usage.*limit/i,
  /premium.*request/i,
  /insufficient.*quota/i,
  /rate.*limit.*exceeded/i,
];

export const isQuotaExceededError = (error: unknown): boolean => {
  if (!error || typeof error !== "object") {
    return false;
  }

  const typedError = error as ErrorResponse;
  const statusCode = typedError.response?.statusCode;

  if (statusCode === 403 || statusCode === 429 || statusCode === 402) {
    const body = typedError.response?.body;
    let errorMessage = "";

    if (typeof body === "string") {
      errorMessage = body;
    } else if (body && typeof body === "object") {
      errorMessage = body.error?.message ?? body.error?.code ?? "";
    }

    if (!errorMessage && typedError.message) {
      errorMessage = typedError.message;
    }

    return QUOTA_EXCEEDED_PATTERNS.some((pattern) =>
      pattern.test(errorMessage),
    );
  }

  return false;
};

export const shouldSwitchToUnlimitedModel = (error: unknown): boolean => {
  return isQuotaExceededError(error);
};

export const getRetryDelay = (error: unknown, attempt: number): number => {
  if (error && typeof error === "object" && "response" in error) {
    const response = (
      error as { response?: { headers?: Record<string, string> } }
    ).response;
    const retryAfter = response?.headers?.["retry-after"];
    if (retryAfter) {
      const seconds = parseInt(retryAfter, 10);
      if (!isNaN(seconds)) {
        return seconds * 1000;
      }
    }
  }
  return COPILOT_INITIAL_RETRY_DELAY * Math.pow(2, attempt);
};
