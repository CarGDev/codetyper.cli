/**
 * Provider types and interfaces for CodeTyper CLI
 */

export type ProviderName = "copilot" | "ollama";

export interface Message {
  role: "system" | "user" | "assistant" | "tool";
  content: string;
  tool_call_id?: string;
  tool_calls?: ToolCall[];
}

export interface ToolCall {
  id: string;
  type: "function";
  function: {
    name: string;
    arguments: string;
  };
}

export interface ToolDefinition {
  type: "function";
  function: {
    name: string;
    description: string;
    parameters: {
      type: "object";
      properties: Record<string, unknown>;
      required?: string[];
    };
  };
}

export interface ChatCompletionOptions {
  model?: string;
  temperature?: number;
  maxTokens?: number;
  tools?: ToolDefinition[];
  stream?: boolean;
}

export interface ChatCompletionResponse {
  content: string | null;
  toolCalls?: ToolCall[];
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  finishReason?: "stop" | "tool_calls" | "length" | "content_filter";
}

export interface StreamChunk {
  type: "content" | "tool_call" | "done" | "error" | "model_switched";
  content?: string;
  toolCall?: Partial<ToolCall>;
  error?: string;
  modelSwitch?: {
    from: string;
    to: string;
    reason: string;
  };
}

export interface ProviderModel {
  id: string;
  name: string;
  maxTokens?: number;
  supportsTools?: boolean;
  supportsStreaming?: boolean;
  costMultiplier?: number;
  isUnlimited?: boolean;
}

export interface ProviderCredentials {
  apiKey?: string;
  baseUrl?: string;
  oauthToken?: string;
  [key: string]: string | undefined;
}

export interface Provider {
  name: ProviderName;
  displayName: string;

  /**
   * Check if the provider is configured and ready
   */
  isConfigured(): Promise<boolean>;

  /**
   * Validate credentials and connection
   */
  validate(): Promise<{ valid: boolean; error?: string }>;

  /**
   * Get available models
   */
  getModels(): Promise<ProviderModel[]>;

  /**
   * Get the default model
   */
  getDefaultModel(): string;

  /**
   * Send a chat completion request
   */
  chat(
    messages: Message[],
    options?: ChatCompletionOptions,
  ): Promise<ChatCompletionResponse>;

  /**
   * Send a streaming chat completion request
   */
  chatStream?(
    messages: Message[],
    options: ChatCompletionOptions | undefined,
    onChunk: (chunk: StreamChunk) => void,
  ): Promise<void>;

  /**
   * Get credentials for this provider
   */
  getCredentials(): Promise<ProviderCredentials>;

  /**
   * Set credentials for this provider
   */
  setCredentials(credentials: ProviderCredentials): Promise<void>;
}

export interface StoredCredentials {
  [provider: string]: ProviderCredentials;
}

export interface ProviderStatus {
  configured: boolean;
  valid: boolean;
  error?: string;
}

export interface ProviderInfo {
  envVar: string;
  description: string;
}

export type ProviderInfoRegistry = Record<ProviderName, ProviderInfo>;

export type LogoutHandler = () => void;

export type LoginHandler = (providerName: ProviderName) => Promise<boolean>;
