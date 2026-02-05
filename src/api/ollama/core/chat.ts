/**
 * Ollama Chat API
 *
 * Low-level API calls for chat completions
 */

import got from "got";
import { OLLAMA_ENDPOINTS, OLLAMA_TIMEOUTS } from "@constants/ollama";
import type { OllamaChatRequest, OllamaChatResponse } from "@/types/ollama";
import type { StreamChunk } from "@/types/providers";

/**
 * Execute non-streaming chat request to Ollama
 */
export const executeChatRequest = async (
  baseUrl: string,
  body: OllamaChatRequest,
): Promise<OllamaChatResponse> => {
  const response = await got
    .post(`${baseUrl}${OLLAMA_ENDPOINTS.CHAT}`, {
      json: body,
      timeout: { request: OLLAMA_TIMEOUTS.CHAT },
    })
    .json<OllamaChatResponse>();

  if (response.error) {
    throw new Error(response.error);
  }

  return response;
};

/**
 * Execute streaming chat request to Ollama
 */
export const executeStreamRequest = (
  baseUrl: string,
  body: OllamaChatRequest,
  onChunk: (chunk: StreamChunk) => void,
): Promise<void> =>
  new Promise((resolve, reject) => {
    const stream = got.stream.post(`${baseUrl}${OLLAMA_ENDPOINTS.CHAT}`, {
      json: body,
      timeout: { request: OLLAMA_TIMEOUTS.CHAT },
    });

    let buffer = "";

    stream.on("data", (data: Buffer) => {
      buffer += data.toString();
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";

      for (const line of lines) {
        if (!line.trim()) continue;

        try {
          const parsed = JSON.parse(line) as OllamaChatResponse;

          if (parsed.error) {
            onChunk({ type: "error", error: parsed.error });
            continue;
          }

          if (parsed.message?.content) {
            onChunk({ type: "content", content: parsed.message.content });
          }

          if (parsed.message?.tool_calls) {
            for (const tc of parsed.message.tool_calls) {
              onChunk({
                type: "tool_call",
                toolCall: {
                  id: tc.id ?? `call_${Date.now()}`,
                  function: {
                    name: tc.function.name,
                    arguments:
                      typeof tc.function.arguments === "string"
                        ? tc.function.arguments
                        : JSON.stringify(tc.function.arguments),
                  },
                },
              });
            }
          }

          if (parsed.done) {
            onChunk({ type: "done" });
          }
        } catch {
          // Ignore parse errors
        }
      }
    });

    stream.on("error", (error: Error) => {
      onChunk({ type: "error", error: error.message });
      reject(error);
    });

    stream.on("end", resolve);
  });
