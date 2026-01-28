/**
 * Provider chat functions
 */

import { getProvider } from "@providers/registry";
import type {
  ProviderName,
  Message,
  ChatCompletionOptions,
  ChatCompletionResponse,
  StreamChunk,
} from "@/types/providers";

export const chat = async (
  providerName: ProviderName,
  messages: Message[],
  options?: ChatCompletionOptions,
): Promise<ChatCompletionResponse> => {
  const provider = getProvider(providerName);

  const isConfigured = await provider.isConfigured();
  if (!isConfigured) {
    throw new Error(
      `Provider ${providerName} is not configured. Run: codetyper login ${providerName}`,
    );
  }

  return provider.chat(messages, options);
};

/**
 * Stream chat completion from provider
 * Falls back to non-streaming if provider doesn't support it
 */
export const chatStream = async (
  providerName: ProviderName,
  messages: Message[],
  options: ChatCompletionOptions | undefined,
  onChunk: (chunk: StreamChunk) => void,
): Promise<void> => {
  const provider = getProvider(providerName);

  const isConfigured = await provider.isConfigured();
  if (!isConfigured) {
    throw new Error(
      `Provider ${providerName} is not configured. Run: codetyper login ${providerName}`,
    );
  }

  // Check if provider supports streaming
  if (provider.chatStream) {
    return provider.chatStream(messages, options, onChunk);
  }

  // Fallback: use non-streaming and emit as single chunk
  const response = await provider.chat(messages, options);

  if (response.content) {
    onChunk({ type: "content", content: response.content });
  }

  if (response.toolCalls) {
    for (const tc of response.toolCalls) {
      onChunk({ type: "tool_call", toolCall: tc });
    }
  }

  onChunk({ type: "done" });
};

export const getDefaultModel = (providerName: ProviderName): string =>
  getProvider(providerName).getDefaultModel();

export const getModels = async (providerName: ProviderName) =>
  getProvider(providerName).getModels();
