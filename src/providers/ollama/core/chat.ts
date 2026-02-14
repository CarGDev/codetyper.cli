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
import { getDefaultOllamaModel } from "@providers/ollama/core/models";
import type {
  Message,
  ChatCompletionOptions,
  ChatCompletionResponse,
  ToolCall,
  ContentPart,
} from "@/types/providers";
import type {
  OllamaChatRequest,
  OllamaChatResponse,
  OllamaToolCall,
  OllamaToolDefinition,
  OllamaMessage,
} from "@/types/ollama";

/**
 * Extract text and images from multimodal content.
 * Ollama uses a separate `images` array of base64 strings rather than
 * inline content parts.
 */
const extractContentParts = (
  content: string | ContentPart[],
): { text: string; images: string[] } => {
  if (typeof content === "string") {
    return { text: content, images: [] };
  }

  const textParts: string[] = [];
  const images: string[] = [];

  for (const part of content) {
    if (part.type === "text") {
      textParts.push(part.text);
    } else if (part.type === "image_url") {
      // Strip the data:image/xxx;base64, prefix if present
      const url = part.image_url.url;
      const base64Match = url.match(/^data:[^;]+;base64,(.+)$/);
      images.push(base64Match ? base64Match[1] : url);
    }
  }

  return { text: textParts.join("\n"), images };
};

/**
 * Format messages for Ollama API
 * Handles regular messages, assistant messages with tool_calls, and tool response messages.
 * Multimodal content (images) is converted to Ollama's `images` array format.
 */
const formatMessages = (messages: Message[]): OllamaMessage[] =>
  messages.map((msg) => {
    const { text, images } = extractContentParts(msg.content);

    const formatted: OllamaMessage = {
      role: msg.role,
      content: text,
    };

    if (images.length > 0) {
      formatted.images = images;
    }

    // Include tool_calls for assistant messages that made tool calls
    if (msg.tool_calls && msg.tool_calls.length > 0) {
      formatted.tool_calls = msg.tool_calls.map((tc) => ({
        id: tc.id,
        function: {
          name: tc.function.name,
          arguments:
            typeof tc.function.arguments === "string"
              ? JSON.parse(tc.function.arguments)
              : tc.function.arguments,
        },
      }));
    }

    return formatted;
  });

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
