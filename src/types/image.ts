/**
 * Image types for multimodal message support
 */

export type ImageMediaType = "image/png" | "image/jpeg" | "image/gif" | "image/webp";

export interface ImageContent {
  type: "image";
  mediaType: ImageMediaType;
  data: string; // base64 encoded
  source?: string; // original file path or "clipboard"
  width?: number;
  height?: number;
}

export interface TextContent {
  type: "text";
  text: string;
}

export type MessageContent = TextContent | ImageContent;

export interface MultimodalMessage {
  role: "system" | "user" | "assistant" | "tool";
  content: string | MessageContent[];
  tool_call_id?: string;
  tool_calls?: Array<{
    id: string;
    type: "function";
    function: {
      name: string;
      arguments: string;
    };
  }>;
}

export interface PastedImage {
  id: string;
  mediaType: ImageMediaType;
  data: string;
  width?: number;
  height?: number;
  timestamp: number;
}

export const isImageContent = (content: MessageContent): content is ImageContent => {
  return content.type === "image";
};

export const isTextContent = (content: MessageContent): content is TextContent => {
  return content.type === "text";
};

export const createTextContent = (text: string): TextContent => ({
  type: "text",
  text,
});

export const createImageContent = (
  data: string,
  mediaType: ImageMediaType,
  source?: string,
): ImageContent => ({
  type: "image",
  mediaType,
  data,
  source,
});
