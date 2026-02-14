import type {
  Message,
  MessageContent,
  ChatCompletionOptions,
  ChatCompletionResponse,
} from "@/types/providers";

export interface FormattedMessage {
  role: string;
  content: MessageContent;
  tool_call_id?: string;
  tool_calls?: Message["tool_calls"];
}

export interface ChatRequestBody {
  model: string;
  messages: FormattedMessage[];
  max_tokens: number;
  temperature: number;
  stream: boolean;
  tools?: ChatCompletionOptions["tools"];
  tool_choice?: string;
}

export interface ChatApiResponse {
  error?: { message?: string };
  choices?: Array<{
    message?: { content?: string; tool_calls?: Message["tool_calls"] };
    finish_reason?: ChatCompletionResponse["finishReason"];
  }>;
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
    total_tokens?: number;
  };
}
