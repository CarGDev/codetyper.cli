/**
 * Provider types and interfaces for CodeTyper CLI
 */

export type ProviderName = "copilot" | "ollama";

/** A text content part in a multimodal message */
export interface TextContentPart {
  type: "text";
  text: string;
}

/** An image content part in a multimodal message (OpenAI-compatible) */
export interface ImageContentPart {
  type: "image_url";
  image_url: {
    url: string; // data:image/png;base64,... or a URL
    detail?: "auto" | "low" | "high";
  };
}

/** A single part of multimodal message content */
export type ContentPart = TextContentPart | ImageContentPart;

/** Message content can be a simple string or an array of content parts */
export type MessageContent = string | ContentPart[];

export interface Message {
  role: "system" | "user" | "assistant" | "tool";
  content: MessageContent;
  tool_call_id?: string;
  tool_calls?: ToolCall[];
}

/**
 * Helper: extract plain text from message content regardless of format
 */
export const getMessageText = (content: MessageContent): string => {
  if (typeof content === "string") return content;
  return content
    .filter((p): p is TextContentPart => p.type === "text")
    .map((p) => p.text)
    .join("");
};

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
  type: "content" | "tool_call" | "done" | "error" | "model_switched" | "usage";
  content?: string;
  toolCall?: Partial<ToolCall>;
  error?: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
  };
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
