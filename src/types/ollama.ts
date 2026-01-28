/**
 * Ollama provider types
 */

export interface OllamaState {
  baseUrl: string;
  defaultModel: string;
}

export interface OllamaTagsResponse {
  models: OllamaModelInfo[];
}

export interface OllamaModelInfo {
  name: string;
  modified_at: string;
  size: number;
}

export interface OllamaChatRequest {
  model: string;
  messages: OllamaMessage[];
  stream: boolean;
  options: OllamaChatOptions;
  tools?: OllamaToolDefinition[];
}

export interface OllamaMessage {
  role: string;
  content: string;
}

export interface OllamaChatOptions {
  temperature: number;
  num_predict: number;
}

export interface OllamaToolDefinition {
  type: "function";
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  };
}

export interface OllamaChatResponse {
  message?: {
    content?: string;
    tool_calls?: OllamaToolCall[];
  };
  done: boolean;
  error?: string;
  prompt_eval_count?: number;
  eval_count?: number;
}

export interface OllamaToolCall {
  id?: string;
  function: {
    name: string;
    arguments: string | Record<string, unknown>;
  };
}

export interface OllamaPullProgress {
  status: string;
  completed?: number;
  total?: number;
}

export type OllamaProgressCallback = (progress: string) => void;
