/**
 * Terminal UI components
 */

export type {
  BoxOptions,
  KeyValueOptions,
  ListOptions,
  MessageOptions,
} from "@interfaces/BoxOptions";
export type {
  BoxStyle,
  BoxAlign,
  HeaderStyle,
  StatusState,
  ToolCallState,
  MessageRole,
} from "@/types/components";

export { box, panel, errorBox, successBox } from "@ui/components/box";
export { header, divider } from "@ui/components/header";
export { keyValue, list } from "@ui/components/list";
export { status, toolCall } from "@ui/components/status";
export { message, codeBlock } from "@ui/components/message";
