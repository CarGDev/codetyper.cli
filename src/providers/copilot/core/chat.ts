/**
 * Copilot chat completion functions
 */

import got from "got";
import { logApi } from "@utils/debug-logger";

import {
  COPILOT_MAX_RETRIES,
  COPILOT_UNLIMITED_MODEL,
  COPILOT_STREAM_TIMEOUT,
  COPILOT_CONNECTION_RETRY_DELAY,
} from "@constants/copilot";
import { refreshToken, buildHeaders } from "@providers/copilot/auth/token";
import {
  getDefaultModel,
  isModelUnlimited,
} from "@providers/copilot/core/models";
import {
  sleep,
  isRateLimitError,
  isConnectionError,
  getRetryDelay,
  isQuotaExceededError,
} from "@providers/copilot/utils";
import type { CopilotToken } from "@/types/copilot";
import type {
  Message,
  MessageContent,
  ChatCompletionOptions,
  ChatCompletionResponse,
  StreamChunk,
} from "@/types/providers";
import { addDebugLog } from "@tui-solid/components/logs/debug-log-panel";

/**
 * Detect if the conversation is agent-initiated.
 * opencode/crush send X-Initiator: "agent" when:
 * - The last non-system message is from assistant (has tool_calls)
 * - There are tool result messages in the conversation
 * This tells the Copilot API to optimize for multi-turn agent flows.
 */
const detectInitiator = (messages: Message[]): "agent" | "user" => {
  for (let i = messages.length - 1; i >= 0; i--) {
    const msg = messages[i];
    if (msg.role === "system") continue;
    if (msg.role === "tool") return "agent";
    if (msg.role === "assistant" && msg.tool_calls && msg.tool_calls.length > 0) return "agent";
    return "user";
  }
  return "user";
};

/**
 * Detect if any message contains image content
 */
const hasVisionContent = (messages: Message[]): boolean =>
  messages.some((msg) => {
    if (typeof msg.content === "string") return false;
    if (!Array.isArray(msg.content)) return false;
    return msg.content.some((part) => part.type === "image_url");
  });

interface CacheControl {
  type: "ephemeral";
}

interface FormattedMessage {
  role: string;
  content: MessageContent;
  tool_call_id?: string;
  tool_calls?: Message["tool_calls"];
  cache_control?: CacheControl;
  /** Opaque reasoning token from previous turn — enables multi-turn reasoning continuity */
  reasoning_opaque?: string;
}

/**
 * Format messages for Copilot API.
 * Tags system messages with cache_control so the API can cache
 * the system prompt across turns (30-50% token savings).
 */
const formatMessages = (messages: Message[]): FormattedMessage[] =>
  messages.map((msg) => {
    const formatted: FormattedMessage = {
      role: msg.role,
      content: msg.content, // Already string or ContentPart[] — pass through
    };

    // Tag system messages with cache_control so Copilot caches the
    // system prompt across turns instead of re-processing it each time
    if (msg.role === "system") {
      formatted.cache_control = { type: "ephemeral" };
    }

    if (msg.tool_call_id) {
      formatted.tool_call_id = msg.tool_call_id;
    }

    if (msg.tool_calls) {
      formatted.tool_calls = msg.tool_calls;
    }

    // Preserve reasoning_opaque from assistant messages for multi-turn continuity
    if (msg.reasoning_opaque) {
      formatted.reasoning_opaque = msg.reasoning_opaque;
    }

    return formatted;
  });

interface ChatRequestBody {
  model: string;
  messages: FormattedMessage[];
  max_tokens: number;
  temperature: number;
  stream: boolean;
  tools?: ChatCompletionOptions["tools"];
  tool_choice?: string;
  /** Request usage data in stream responses (OpenAI-compatible) */
  stream_options?: { include_usage: boolean };
}

// Default max tokens for requests without tools
const DEFAULT_MAX_TOKENS = 4096;
// Higher max tokens when tools are enabled (tool calls often write large content)
const DEFAULT_MAX_TOKENS_WITH_TOOLS = 16384;

const buildRequestBody = (
  messages: Message[],
  options: ChatCompletionOptions | undefined,
  stream: boolean,
  modelOverride?: string,
): ChatRequestBody => {
  // Use model override if provided, otherwise use options model or default
  const model =
    modelOverride ??
    (options?.model && options.model !== "auto"
      ? options.model
      : getDefaultModel());

  // Use higher max_tokens when tools are enabled to prevent truncation
  const hasTools = options?.tools && options.tools.length > 0;
  const defaultTokens = hasTools
    ? DEFAULT_MAX_TOKENS_WITH_TOOLS
    : DEFAULT_MAX_TOKENS;

  const body: ChatRequestBody = {
    model,
    messages: formatMessages(messages),
    max_tokens: options?.maxTokens ?? defaultTokens,
    temperature: options?.temperature ?? 0.3,
    stream,
  };

  // Request usage data when streaming
  if (stream) {
    body.stream_options = { include_usage: true };
  }

  if (hasTools) {
    body.tools = options.tools;
    body.tool_choice = "auto";
  }

  return body;
};

export interface ChatResult extends ChatCompletionResponse {
  modelSwitched?: boolean;
  switchedFrom?: string;
  switchedTo?: string;
}

const getEndpoint = (token: CopilotToken): string =>
  (token.endpoints?.api ?? "https://api.githubcopilot.com") +
  "/chat/completions";

const executeChatRequest = async (
  endpoint: string,
  token: CopilotToken,
  body: ChatRequestBody,
  extraHeaders?: Record<string, string>,
): Promise<ChatCompletionResponse> => {
  const response = await got
    .post(endpoint, {
      headers: { ...buildHeaders(token), ...extraHeaders },
      json: body,
    })
    .json<{
      error?: { message?: string };
      choices?: Array<{
        message?: {
          content?: string;
          tool_calls?: Message["tool_calls"];
          reasoning_text?: string;
          reasoning_opaque?: string;
        };
        finish_reason?: ChatCompletionResponse["finishReason"];
      }>;
      usage?: {
        prompt_tokens?: number;
        completion_tokens?: number;
        total_tokens?: number;
      };
    }>();

  if (response.error) {
    throw new Error(response.error.message ?? "Copilot API error");
  }

  const choice = response.choices?.[0];
  if (!choice) {
    throw new Error("No response from Copilot");
  }

  const result: ChatCompletionResponse = {
    content: choice.message?.content ?? null,
    finishReason: choice.finish_reason,
  };

  // Preserve reasoning tokens for multi-turn continuity
  if (choice.message?.reasoning_text) {
    result.reasoningText = choice.message.reasoning_text;
  }
  if (choice.message?.reasoning_opaque) {
    result.reasoningOpaque = choice.message.reasoning_opaque;
  }

  if (choice.message?.tool_calls) {
    result.toolCalls = choice.message.tool_calls;
  }

  if (response.usage) {
    result.usage = {
      promptTokens: response.usage.prompt_tokens ?? 0,
      completionTokens: response.usage.completion_tokens ?? 0,
      totalTokens: response.usage.total_tokens ?? 0,
    };
  }

  return result;
};

export const chat = async (
  messages: Message[],
  options?: ChatCompletionOptions,
): Promise<ChatResult> => {
  logApi("copilot chat request", { messageCount: messages.length, model: options?.model, toolCount: options?.tools?.length });
  const token = await refreshToken();
  const endpoint = getEndpoint(token);
  const originalModel =
    options?.model && options.model !== "auto"
      ? options.model
      : getDefaultModel();
  const body = buildRequestBody(messages, options, false);

  // Dynamic headers for better API routing
  const extraHeaders: Record<string, string> = {
    "X-Initiator": detectInitiator(messages),
  };
  if (hasVisionContent(messages)) {
    extraHeaders["Copilot-Vision-Request"] = "true";
  }

  let lastError: unknown;
  let switchedToUnlimited = false;

  for (let attempt = 0; attempt < COPILOT_MAX_RETRIES; attempt++) {
    try {
      const result = await executeChatRequest(endpoint, token, body, extraHeaders);

      if (switchedToUnlimited) {
        return {
          ...result,
          modelSwitched: true,
          switchedFrom: originalModel,
          switchedTo: COPILOT_UNLIMITED_MODEL,
        };
      }

      return result;
    } catch (error) {
      lastError = error;

      // Check if quota exceeded and current model is not unlimited
      if (
        isQuotaExceededError(error) &&
        !isModelUnlimited(body.model) &&
        !switchedToUnlimited
      ) {
        // Switch to unlimited model and retry
        body.model = COPILOT_UNLIMITED_MODEL;
        switchedToUnlimited = true;
        continue;
      }

      if (isRateLimitError(error) && attempt < COPILOT_MAX_RETRIES - 1) {
        const delay = getRetryDelay(error, attempt);
        await sleep(delay);
        continue;
      }

      throw error;
    }
  }

  throw lastError;
};

/**
 * Process a single SSE line and emit appropriate chunks
 */
const processStreamLine = (
  line: string,
  onChunk: (chunk: StreamChunk) => void,
): boolean => {
  if (!line.startsWith("data: ")) {
    return false;
  }

  const jsonStr = line.slice(6).trim();
  if (jsonStr === "[DONE]") {
    onChunk({ type: "done" });
    return true;
  }

  try {
    const parsed = JSON.parse(jsonStr);
    const delta = parsed.choices?.[0]?.delta;
    const finishReason = parsed.choices?.[0]?.finish_reason;

    if (delta?.content) {
      onChunk({ type: "content", content: delta.content });
    }

    // Extract reasoning tokens from chain-of-thought models (o1, o3, gpt-5)
    if (delta?.reasoning_text) {
      onChunk({ type: "reasoning", reasoning: delta.reasoning_text });
    }
    if (delta?.reasoning_opaque) {
      onChunk({ type: "reasoning", reasoningOpaque: delta.reasoning_opaque });
    }

    if (delta?.tool_calls) {
      for (const tc of delta.tool_calls) {
        addDebugLog("api", `Tool call chunk: ${JSON.stringify(tc)}`);
        onChunk({ type: "tool_call", toolCall: tc });
      }
    }

    // Capture usage data (OpenAI sends it in the final chunk before [DONE])
    if (parsed.usage) {
      const promptTokens = parsed.usage.prompt_tokens ?? 0;
      const completionTokens = parsed.usage.completion_tokens ?? 0;
      onChunk({
        type: "usage",
        usage: { promptTokens, completionTokens },
      });
    }

    // Handle truncation: if finish_reason is "length", content was cut off
    if (finishReason === "length") {
      addDebugLog("api", "Stream truncated due to max_tokens limit");
      onChunk({
        type: "error",
        error: "Response truncated: max_tokens limit reached",
      });
    }
  } catch (err) {
    addDebugLog("api", `Stream parse error: ${err instanceof Error ? err.message : String(err)}`);
  }

  return false;
};

const executeStream = async (
  endpoint: string,
  token: CopilotToken,
  body: ChatRequestBody,
  onChunk: (chunk: StreamChunk) => void,
  extraHeaders?: Record<string, string>,
): Promise<void> => {
  logApi("copilot stream request", { model: body.model, messageCount: body.messages.length, toolCount: body.tools?.length, initiator: extraHeaders?.["X-Initiator"], hasCache: body.messages.some((m: FormattedMessage) => !!m.cache_control) });
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      ...buildHeaders(token),
      Accept: "text/event-stream",
      ...extraHeaders,
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(COPILOT_STREAM_TIMEOUT),
  });

  if (!response.ok) {
    throw new Error(
      `Copilot API error: ${response.status} ${response.statusText}`,
    );
  }

  if (!response.body) {
    throw new Error("No response body from Copilot stream");
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let doneReceived = false;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";

      for (const line of lines) {
        if (processStreamLine(line, onChunk)) {
          doneReceived = true;
          return;
        }
      }
    }
  } finally {
    reader.releaseLock();
  }

  // Process remaining buffer
  if (buffer.trim()) {
    processStreamLine(buffer, onChunk);
  }

  if (!doneReceived) {
    addDebugLog(
      "api",
      "Stream ended without [DONE] message, sending done chunk",
    );
    onChunk({ type: "done" });
  }
};

export const chatStream = async (
  messages: Message[],
  options: ChatCompletionOptions | undefined,
  onChunk: (chunk: StreamChunk) => void,
): Promise<void> => {
  const initiator = detectInitiator(messages);
  addDebugLog("api", `Copilot stream request: ${messages.length} messages, initiator=${initiator}`);
  const token = await refreshToken();
  const endpoint = getEndpoint(token);
  const originalModel =
    options?.model && options.model !== "auto"
      ? options.model
      : getDefaultModel();
  const body = buildRequestBody(messages, options, true);
  addDebugLog("api", `Copilot model: ${body.model}`);

  // Dynamic headers for better API routing
  const extraHeaders: Record<string, string> = {
    "X-Initiator": initiator,
  };
  if (hasVisionContent(messages)) {
    extraHeaders["Copilot-Vision-Request"] = "true";
  }

  let lastError: unknown;
  let switchedToUnlimited = false;

  for (let attempt = 0; attempt < COPILOT_MAX_RETRIES; attempt++) {
    try {
      // Notify about model switch before streaming starts
      if (switchedToUnlimited) {
        onChunk({
          type: "model_switched",
          modelSwitch: {
            from: originalModel,
            to: COPILOT_UNLIMITED_MODEL,
            reason: "Quota exceeded - switched to unlimited model",
          },
        });
      }

      await executeStream(endpoint, token, body, onChunk, extraHeaders);
      return;
    } catch (error) {
      lastError = error;

      // Check if quota exceeded and current model is not unlimited
      if (
        isQuotaExceededError(error) &&
        !isModelUnlimited(body.model) &&
        !switchedToUnlimited
      ) {
        // Switch to unlimited model and retry
        body.model = COPILOT_UNLIMITED_MODEL;
        switchedToUnlimited = true;
        continue;
      }

      if (isConnectionError(error) && attempt < COPILOT_MAX_RETRIES - 1) {
        const delay = COPILOT_CONNECTION_RETRY_DELAY * Math.pow(2, attempt);
        addDebugLog(
          "api",
          `Connection error, retrying in ${delay}ms (attempt ${attempt + 1})`,
        );
        await sleep(delay);
        continue;
      }

      if (isRateLimitError(error) && attempt < COPILOT_MAX_RETRIES - 1) {
        const delay = getRetryDelay(error, attempt);
        await sleep(delay);
        continue;
      }

      throw error;
    }
  }

  throw lastError;
};
