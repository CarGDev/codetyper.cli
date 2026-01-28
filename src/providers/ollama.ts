/**
 * Ollama provider for CodeTyper CLI (local models)
 */

import { OLLAMA_PROVIDER_NAME, OLLAMA_DISPLAY_NAME } from "@constants/ollama";
import {
  isOllamaConfigured,
  validateOllama,
} from "@providers/ollama/validation";
import {
  getOllamaModels,
  getDefaultOllamaModel,
} from "@providers/ollama/models";
import { ollamaChat } from "@providers/ollama/chat";
import { ollamaChatStream } from "@providers/ollama/stream";
import {
  getOllamaCredentials,
  setOllamaCredentials,
} from "@providers/ollama/credentials";
import { pullOllamaModel } from "@providers/ollama/pull";
import type { Provider } from "@/types/providers";

export const ollamaProvider: Provider = {
  name: OLLAMA_PROVIDER_NAME,
  displayName: OLLAMA_DISPLAY_NAME,
  isConfigured: isOllamaConfigured,
  validate: validateOllama,
  getModels: getOllamaModels,
  getDefaultModel: getDefaultOllamaModel,
  chat: ollamaChat,
  chatStream: ollamaChatStream,
  getCredentials: getOllamaCredentials,
  setCredentials: setOllamaCredentials,
};

export {
  isOllamaConfigured,
  validateOllama,
  getOllamaModels,
  getDefaultOllamaModel,
  ollamaChat,
  ollamaChatStream,
  getOllamaCredentials,
  setOllamaCredentials,
  pullOllamaModel,
};
