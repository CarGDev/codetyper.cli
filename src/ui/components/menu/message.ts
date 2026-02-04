/**
 * Message and code block display components
 */

import { Style, Theme } from "@constants/styles";
import { ROLE_CONFIG } from "@constants/components";
import { colors } from "@ui/styles/colors";
import { wrap, getTerminalWidth } from "@ui/styles/text";
import type { MessageRole } from "@/types/components";
import type { MessageOptions } from "@interfaces/BoxOptions";

type ThemeKey = keyof typeof Theme;

/**
 * Create a message bubble
 */
export const message = (
  role: MessageRole,
  content: string,
  options: MessageOptions = {},
): string => {
  const config = ROLE_CONFIG[role];
  const color = Theme[config.colorKey as ThemeKey];
  const output: string[] = [];

  if (options.showRole !== false) {
    output.push(colors.bold(color + config.label + Style.RESET));
  }

  // Wrap content to terminal width
  const wrapped = wrap(content, getTerminalWidth() - 4);
  for (const line of wrapped) {
    output.push("  " + line);
  }

  return output.join("\n");
};

/**
 * Create a code block
 */
export const codeBlock = (code: string, language?: string): string => {
  const lines = code.split("\n");
  const output: string[] = [];

  // Header
  if (language) {
    output.push(Theme.textMuted + "```" + language + Style.RESET);
  } else {
    output.push(Theme.textMuted + "```" + Style.RESET);
  }

  // Code with line numbers
  const maxLineNum = String(lines.length).length;
  for (let i = 0; i < lines.length; i++) {
    const lineNum = String(i + 1).padStart(maxLineNum, " ");
    output.push(Theme.textMuted + lineNum + " │ " + Style.RESET + lines[i]);
  }

  // Footer
  output.push(Theme.textMuted + "```" + Style.RESET);

  return output.join("\n");
};
