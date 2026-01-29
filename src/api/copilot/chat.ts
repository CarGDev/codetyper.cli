/**
 * Copilot Chat API
 *
 * Low-level API calls for chat completions
 */

import got from "got";
import type { CopilotToken } from "@/types/copilot";
import type {
  Message,
  ChatCompletionOptions,
  ChatCompletionResponse,
  StreamChunk,
} from "@/types/providers";
import { buildCopilotHeaders } from "@api/copilot/token";

interface FormattedMessage {
  role: string;
  content: string;
  tool_call_id?: string;
  tool_calls?: Message["tool_calls"];
}

interface ChatRequestBody {
  model: string;
  messages: FormattedMessage[];
  max_tokens: number;
  temperature: number;
  stream: boolean;
  tools?: ChatCompletionOptions["tools"];
  tool_choice?: string;
}

interface ChatApiResponse {
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

/**
 * Execute streaming chat request
 */
export const executeStreamRequest = (
  endpoint: string,
  token: CopilotToken,
  body: ChatRequestBody,
  onChunk: (chunk: StreamChunk) => void,
): Promise<void> =>
  new Promise((resolve, reject) => {
    const stream = got.stream.post(endpoint, {
      headers: buildCopilotHeaders(token),
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
