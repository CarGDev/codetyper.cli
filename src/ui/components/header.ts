/**
 * Header and divider components
 */

import { Style, Theme } from "@constants/styles";
import { colors } from "@ui/styles/colors";
import { stripAnsi, getTerminalWidth, line } from "@ui/styles/text";
import { box } from "@ui/components/box";
import type { HeaderStyle } from "@/types/components";

const HEADER_STYLE_HANDLERS: Record<HeaderStyle, (text: string) => string> = {
  box: (text: string) => box(text, { title: "", align: "center", padding: 0 }),
  simple: (text: string) => colors.bold(colors.primary(text)),
  line: (text: string) => {
    const width = getTerminalWidth();
    const textLength = stripAnsi(text).length;
    const leftWidth = 2;
    const rightWidth = Math.max(0, width - textLength - leftWidth - 4);

    return (
      Theme.textMuted +
      "─".repeat(leftWidth) +
      Style.RESET +
      " " +
      colors.bold(colors.primary(text)) +
      " " +
      Theme.textMuted +
      "─".repeat(rightWidth) +
      Style.RESET
    );
  },
};

/**
 * Create a section header
 */
export const header = (text: string, style: HeaderStyle = "line"): string =>
  HEADER_STYLE_HANDLERS[style](text);

/**
 * Create a divider line
 */
export const divider = (char = "─", color = Theme.textMuted): string =>
  color + line(char) + Style.RESET;
