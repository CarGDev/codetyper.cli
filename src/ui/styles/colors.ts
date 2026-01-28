/**
 * Pre-built color functions
 */

import { Style, Theme } from "@constants/styles";
import { colored } from "@ui/styles/apply";

// Pre-built color functions
export const colors = {
  primary: colored(Theme.primary),
  secondary: colored(Theme.secondary),
  accent: colored(Theme.accent),
  success: colored(Theme.success),
  warning: colored(Theme.warning),
  error: colored(Theme.error),
  info: colored(Theme.info),
  muted: colored(Theme.textMuted),
  dim: colored(Style.DIM),
  bold: (text: string) => Style.BOLD + text + Style.RESET,
  italic: (text: string) => Style.ITALIC + text + Style.RESET,
  underline: (text: string) => Style.UNDERLINE + text + Style.RESET,
} as const;
