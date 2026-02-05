/**
 * Ollama provider streaming
 */

import got from "got";

import { OLLAMA_ENDPOINTS, OLLAMA_TIMEOUTS } from "@constants/ollama";
import { getOllamaBaseUrl } from "@providers/ollama/state";
import { buildChatRequest, mapToolCall } from "@providers/ollama/core/chat";
import type {
  Message,
  ChatCompletionOptions,
  StreamChunk,
} from "@/types/providers";
import type { OllamaChatResponse } from "@/types/ollama";
import { addDebugLog } from "@tui-solid/components/logs/debug-log-panel";

const parseStreamLine = (
  line: string,
  onChunk: (chunk: StreamChunk) => void,
): void => {
  if (!line.trim()) return;

  try {
    const parsed = JSON.parse(line) as OllamaChatResponse;

    if (parsed.message?.content) {
      onChunk({ type: "content", content: parsed.message.content });
    }

    if (parsed.message?.tool_calls) {
      for (const tc of parsed.message.tool_calls) {
        onChunk({
          type: "tool_call",
          toolCall: mapToolCall(tc),
        });
      }
    }

    if (parsed.done) {
      onChunk({ type: "done" });
    }
  } catch {
    // Ignore parse errors
  }
};

const processStreamData = (
  data: Buffer,
  buffer: string,
  onChunk: (chunk: StreamChunk) => void,
): string => {
  const combined = buffer + data.toString();
  const lines = combined.split("\n");
  const remaining = lines.pop() || "";

  for (const line of lines) {
    parseStreamLine(line, onChunk);
  }

  return remaining;
};

export const ollamaChatStream = async (
  messages: Message[],
  options: ChatCompletionOptions | undefined,
  onChunk: (chunk: StreamChunk) => void,
): Promise<void> => {
  const baseUrl = getOllamaBaseUrl();
  const body = buildChatRequest(messages, options, true);
  addDebugLog(
    "api",
    `Ollama stream request: ${messages.length} msgs, model=${body.model}`,
  );

  const stream = got.stream.post(`${baseUrl}${OLLAMA_ENDPOINTS.CHAT}`, {
    json: body,
    timeout: { request: OLLAMA_TIMEOUTS.CHAT },
  });

  let buffer = "";

  stream.on("data", (data: Buffer) => {
    buffer = processStreamData(data, buffer, onChunk);
  });

  stream.on("error", (error: Error) => {
    onChunk({ type: "error", error: error.message });
  });

  return new Promise((resolve, reject) => {
    stream.on("end", resolve);
    stream.on("error", reject);
  });
};
