/**
 * UI component types
 */

import type { BoxChars } from "@constants/components";

export type BoxStyle = keyof typeof BoxChars;

export type BoxAlign = "left" | "center" | "right";

export type HeaderStyle = "line" | "box" | "simple";

export type StatusState =
  | "success"
  | "error"
  | "warning"
  | "info"
  | "pending"
  | "running";

export type ToolCallState = "pending" | "running" | "success" | "error";

export type MessageRole = "user" | "assistant" | "system" | "tool";

export type TipPart = {
  text: string;
  highlight: boolean;
};
