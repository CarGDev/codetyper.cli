import got from "got";
import type { CopilotToken } from "@/types/copilot";
import type { StreamChunk } from "@/types/providers";
import { buildCopilotHeaders } from "@api/copilot/auth/token";
import { ChatRequestBody } from "@/interfaces/api/copilot/core";

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
