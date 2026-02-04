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

export { box, panel, errorBox, successBox } from "@ui/components/core/box";
export { header, divider } from "@ui/components/menu/header";
export { keyValue, list } from "@ui/components/menu/list";
export { status, toolCall } from "@ui/components/menu/status";
export { message, codeBlock } from "@ui/components/menu/message";
