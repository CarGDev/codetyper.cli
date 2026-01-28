/**
 * Ollama model pull functionality
 */

import got from "got";

import { OLLAMA_ENDPOINTS } from "@constants/ollama";
import { getOllamaBaseUrl } from "@providers/ollama/state";
import type {
  OllamaPullProgress,
  OllamaProgressCallback,
} from "@/types/ollama";

const formatProgress = (parsed: OllamaPullProgress): string => {
  if (parsed.completed && parsed.total) {
    const percentage = Math.round((parsed.completed / parsed.total) * 100);
    return `${parsed.status} (${percentage}%)`;
  }
  return parsed.status;
};

const parseProgressLine = (
  line: string,
  onProgress?: OllamaProgressCallback,
): void => {
  if (!line.trim() || !onProgress) return;

  try {
    const parsed = JSON.parse(line) as OllamaPullProgress;
    if (parsed.status) {
      onProgress(formatProgress(parsed));
    }
  } catch {
    // Ignore parse errors
  }
};

const processProgressData = (
  data: Buffer,
  buffer: string,
  onProgress?: OllamaProgressCallback,
): string => {
  const combined = buffer + data.toString();
  const lines = combined.split("\n");
  const remaining = lines.pop() || "";

  for (const line of lines) {
    parseProgressLine(line, onProgress);
  }

  return remaining;
};

export const pullOllamaModel = async (
  modelName: string,
  onProgress?: OllamaProgressCallback,
): Promise<void> => {
  const baseUrl = getOllamaBaseUrl();

  const stream = got.stream.post(`${baseUrl}${OLLAMA_ENDPOINTS.PULL}`, {
    json: { name: modelName },
  });

  let buffer = "";

  stream.on("data", (data: Buffer) => {
    buffer = processProgressData(data, buffer, onProgress);
  });

  return new Promise((resolve, reject) => {
    stream.on("end", resolve);
    stream.on("error", reject);
  });
};
