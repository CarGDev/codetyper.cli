/**
 * Ollama provider chat
 */

import got from "got";

import {
  OLLAMA_ENDPOINTS,
  OLLAMA_TIMEOUTS,
  OLLAMA_CHAT_OPTIONS,
} from "@constants/ollama";
import { getOllamaBaseUrl } from "@providers/ollama/state";
import { getDefaultOllamaModel } from "@providers/ollama/models";
import type {
  Message,
  ChatCompletionOptions,
  ChatCompletionResponse,
  ToolCall,
} from "@/types/providers";
import type {
  OllamaChatRequest,
  OllamaChatResponse,
  OllamaToolCall,
  OllamaToolDefinition,
} from "@/types/ollama";

const formatMessages = (
  messages: Message[],
): Array<{ role: string; content: string }> =>
  messages.map((msg) => ({
    role: msg.role,
    content: msg.content,
  }));

const formatTools = (
  tools: ChatCompletionOptions["tools"],
): OllamaToolDefinition[] | undefined => {
  if (!tools || tools.length === 0) return undefined;

  return tools.map((tool) => ({
    type: "function" as const,
    function: {
      name: tool.function.name,
      description: tool.function.description,
      parameters: tool.function.parameters,
    },
  }));
};

const buildChatRequest = (
  messages: Message[],
  options?: ChatCompletionOptions,
  stream = false,
): OllamaChatRequest => {
  // When model is "auto" or undefined, use the provider's default model
  const model =
    options?.model && options.model !== "auto"
      ? options.model
      : getDefaultOllamaModel();

  const request: OllamaChatRequest = {
    model,
    messages: formatMessages(messages),
    stream,
    options: {
      temperature:
        options?.temperature ?? OLLAMA_CHAT_OPTIONS.DEFAULT_TEMPERATURE,
      num_predict: options?.maxTokens || OLLAMA_CHAT_OPTIONS.DEFAULT_MAX_TOKENS,
    },
  };

  const formattedTools = formatTools(options?.tools);
  if (formattedTools) {
    request.tools = formattedTools;
  }

  return request;
};

const mapToolCall = (tc: OllamaToolCall): ToolCall => ({
  id: tc.id || `call_${Date.now()}`,
  type: "function",
  function: {
    name: tc.function.name,
    arguments:
      typeof tc.function.arguments === "string"
        ? tc.function.arguments
        : JSON.stringify(tc.function.arguments),
  },
});

const buildChatResponse = (
  response: OllamaChatResponse,
): ChatCompletionResponse => {
  const result: ChatCompletionResponse = {
    content: response.message?.content || null,
    finishReason: response.done ? "stop" : "length",
  };

  if (response.message?.tool_calls) {
    result.toolCalls = response.message.tool_calls.map(mapToolCall);
    result.finishReason = "tool_calls";
  }

  if (response.prompt_eval_count || response.eval_count) {
    result.usage = {
      promptTokens: response.prompt_eval_count || 0,
      completionTokens: response.eval_count || 0,
      totalTokens:
        (response.prompt_eval_count || 0) + (response.eval_count || 0),
    };
  }

  return result;
};

export const ollamaChat = async (
  messages: Message[],
  options?: ChatCompletionOptions,
): Promise<ChatCompletionResponse> => {
  const baseUrl = getOllamaBaseUrl();
  const body = buildChatRequest(messages, options, false);

  const response = await got
    .post(`${baseUrl}${OLLAMA_ENDPOINTS.CHAT}`, {
      json: body,
      timeout: { request: OLLAMA_TIMEOUTS.CHAT },
    })
    .json<OllamaChatResponse>();

  if (response.error) {
    throw new Error(response.error);
  }

  return buildChatResponse(response);
};

export { buildChatRequest, mapToolCall };
