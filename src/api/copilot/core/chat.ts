import got from "got";
import type { CopilotToken } from "@/types/copilot";
import type {
  Message,
  ChatCompletionOptions,
  ChatCompletionResponse,
} from "@/types/providers";

import { buildCopilotHeaders } from "@api/copilot/auth/token";
import {
  FormattedMessage,
  ChatRequestBody,
  ChatApiResponse,
} from "@/interfaces/api/copilot/core";

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

/**
 * Get the chat endpoint from token
 */
export const getEndpoint = (token: CopilotToken): string =>
  (token.endpoints?.api ?? "https://api.githubcopilot.com") +
  "/chat/completions";

/**
 * Build request body for chat API
 */
export const buildRequestBody = (
  messages: Message[],
  model: string,
  options?: ChatCompletionOptions,
  stream = false,
): ChatRequestBody => {
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

/**
 * Execute non-streaming chat request
 */
export const executeChatRequest = async (
  endpoint: string,
  token: CopilotToken,
  body: ChatRequestBody,
): Promise<ChatCompletionResponse> => {
  const response = await got
    .post(endpoint, {
      headers: buildCopilotHeaders(token),
      json: body,
    })
    .json<ChatApiResponse>();

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
