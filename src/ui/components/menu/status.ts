/**
 * Status and tool call display components
 */

import { Style, Theme, Icons } from "@constants/styles";
import { STATUS_INDICATORS, TOOL_CALL_ICONS } from "@constants/components";
import type { StatusState, ToolCallState } from "@/types/components";

type ThemeKey = keyof typeof Theme;
type IconKey = keyof typeof Icons;

/**
 * Create a status indicator
 */
export const status = (state: StatusState, text: string): string => {
  const config = STATUS_INDICATORS[state];
  const icon = Icons[config.iconKey as IconKey];
  const color = Theme[config.colorKey as ThemeKey];
  return color + icon + Style.RESET + " " + text;
};

/**
 * Create a tool call display
 */
export const toolCall = (
  tool: string,
  description: string,
  state: ToolCallState = "pending",
): string => {
  const toolLower = tool.toLowerCase() as keyof typeof TOOL_CALL_ICONS;
  const iconConfig = TOOL_CALL_ICONS[toolLower] || TOOL_CALL_ICONS.default;

  const stateColorMap: Record<ToolCallState, string> = {
    pending: Style.DIM,
    running: Theme.primary,
    success: Theme.success,
    error: Theme.error,
  };

  const icon = Icons[iconConfig.iconKey as IconKey];
  const iconColor = Theme[iconConfig.colorKey as ThemeKey];
  const stateColor = stateColorMap[state];

  return (
    stateColor +
    iconColor +
    icon +
    Style.RESET +
    stateColor +
    " " +
    description +
    Style.RESET
  );
};
