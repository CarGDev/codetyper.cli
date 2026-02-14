/**
 * Ollama provider streaming
 */

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

    // Capture token usage from Ollama response (sent with done=true)
    if (parsed.done && (parsed.prompt_eval_count || parsed.eval_count)) {
      onChunk({
        type: "usage",
        usage: {
          promptTokens: parsed.prompt_eval_count ?? 0,
          completionTokens: parsed.eval_count ?? 0,
        },
      });
    }

    if (parsed.done) {
      onChunk({ type: "done" });
    }
  } catch {
    // Ignore parse errors
  }
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

  const response = await fetch(`${baseUrl}${OLLAMA_ENDPOINTS.CHAT}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(OLLAMA_TIMEOUTS.CHAT),
  });

  if (!response.ok) {
    throw new Error(
      `Ollama API error: ${response.status} ${response.statusText}`,
    );
  }

  if (!response.body) {
    throw new Error("No response body from Ollama stream");
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
        parseStreamLine(line, (chunk) => {
          if (chunk.type === "done") {
            doneReceived = true;
          }
          onChunk(chunk);
        });
      }
    }
  } finally {
    reader.releaseLock();
  }

  // Process remaining buffer
  if (buffer.trim()) {
    parseStreamLine(buffer, (chunk) => {
      if (chunk.type === "done") {
        doneReceived = true;
      }
      onChunk(chunk);
    });
  }

  if (!doneReceived) {
    addDebugLog(
      "api",
      "Ollama stream ended without done, sending done chunk",
    );
    onChunk({ type: "done" });
  }
};
