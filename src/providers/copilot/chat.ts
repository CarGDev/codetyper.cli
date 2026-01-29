/**
 * Copilot chat completion functions
 */

import got from "got";

import {
  COPILOT_MAX_RETRIES,
  COPILOT_UNLIMITED_MODEL,
} from "@constants/copilot";
import { refreshToken, buildHeaders } from "@providers/copilot/token";
import { getDefaultModel, isModelUnlimited } from "@providers/copilot/models";
import {
  sleep,
  isRateLimitError,
  getRetryDelay,
  isQuotaExceededError,
} from "@providers/copilot/utils";
import type { CopilotToken } from "@/types/copilot";
import type {
  Message,
  ChatCompletionOptions,
  ChatCompletionResponse,
  StreamChunk,
} from "@/types/providers";
import { addDebugLog } from "@tui-solid/components/debug-log-panel";

interface FormattedMessage {
  role: string;
  content: string;
  tool_call_id?: string;
  tool_calls?: Message["tool_calls"];
}

const formatMessages = (messages: Message[]): FormattedMessage[] =>
  messages.map((msg) => {
    const formatted: FormattedMessage = {
      role: msg.role,
      content: msg.content,
    };

    if (msg.tool_call_id) {
      formatted.tool_call_id = msg.tool_call_id;
    }

    if (msg.tool_calls) {
      formatted.tool_calls = msg.tool_calls;
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
}

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

  const body: ChatRequestBody = {
    model,
    messages: formatMessages(messages),
    max_tokens: options?.maxTokens ?? 4096,
    temperature: options?.temperature ?? 0.3,
    stream,
  };

  if (options?.tools && options.tools.length > 0) {
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
): Promise<ChatCompletionResponse> => {
  const response = await got
    .post(endpoint, {
      headers: buildHeaders(token),
      json: body,
    })
    .json<{
      error?: { message?: string };
      choices?: Array<{
        message?: { content?: string; tool_calls?: Message["tool_calls"] };
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
  const token = await refreshToken();
  const endpoint = getEndpoint(token);
  const originalModel =
    options?.model && options.model !== "auto"
      ? options.model
      : getDefaultModel();
  const body = buildRequestBody(messages, options, false);

  let lastError: unknown;
  let switchedToUnlimited = false;

  for (let attempt = 0; attempt < COPILOT_MAX_RETRIES; attempt++) {
    try {
      const result = await executeChatRequest(endpoint, token, body);

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

const executeStream = (
  endpoint: string,
  token: CopilotToken,
  body: ChatRequestBody,
  onChunk: (chunk: StreamChunk) => void,
): Promise<void> =>
  new Promise((resolve, reject) => {
    const stream = got.stream.post(endpoint, {
      headers: buildHeaders(token),
      json: body,
    });

    let buffer = "";

    stream.on("data", (data: Buffer) => {
      buffer += data.toString();
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";

      for (const line of lines) {
        if (line.startsWith("data: ")) {
          const jsonStr = line.slice(6).trim();
          if (jsonStr === "[DONE]") {
            onChunk({ type: "done" });
            return;
          }

          try {
            const parsed = JSON.parse(jsonStr);
            const delta = parsed.choices?.[0]?.delta;

            if (delta?.content) {
              onChunk({ type: "content", content: delta.content });
            }

            if (delta?.tool_calls) {
              for (const tc of delta.tool_calls) {
                addDebugLog("api", `Tool call chunk: ${JSON.stringify(tc)}`);
                onChunk({ type: "tool_call", toolCall: tc });
              }
            }
          } catch {
            // Ignore parse errors in stream
          }
        }
      }
    });

    stream.on("error", (error: Error) => {
      onChunk({ type: "error", error: error.message });
      reject(error);
    });

    stream.on("end", resolve);
  });

export const chatStream = async (
  messages: Message[],
  options: ChatCompletionOptions | undefined,
  onChunk: (chunk: StreamChunk) => void,
): Promise<void> => {
  addDebugLog("api", `Copilot stream request: ${messages.length} messages`);
  const token = await refreshToken();
  const endpoint = getEndpoint(token);
  const originalModel =
    options?.model && options.model !== "auto"
      ? options.model
      : getDefaultModel();
  const body = buildRequestBody(messages, options, true);
  addDebugLog("api", `Copilot model: ${body.model}`);

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

      await executeStream(endpoint, token, body, onChunk);
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
