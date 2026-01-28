/**
 * Box component utilities
 */

import { BoxChars, BOX_DEFAULTS } from "@constants/components";
import { Style, Theme } from "@constants/styles";
import { colors } from "@ui/styles/colors";
import { stripAnsi, getTerminalWidth } from "@ui/styles/text";
import type { BoxOptions } from "@interfaces/BoxOptions";

const ALIGN_HANDLERS = {
  center: (
    line: string,
    innerWidth: number,
    strippedLength: number,
  ): string => {
    const leftPad = Math.floor((innerWidth - strippedLength) / 2);
    const rightPad = innerWidth - strippedLength - leftPad;
    return " ".repeat(leftPad) + line + " ".repeat(rightPad);
  },
  right: (line: string, innerWidth: number, strippedLength: number): string =>
    " ".repeat(innerWidth - strippedLength) + line,
  left: (line: string, innerWidth: number, strippedLength: number): string =>
    line + " ".repeat(innerWidth - strippedLength),
};

/**
 * Create a box around content
 */
export const box = (
  content: string | string[],
  options: BoxOptions = {},
): string => {
  const {
    title,
    style = BOX_DEFAULTS.style,
    padding = BOX_DEFAULTS.padding,
    color = Theme.textMuted,
    width: targetWidth,
    align = BOX_DEFAULTS.align,
  } = options;

  const chars = BoxChars[style];
  const lines = Array.isArray(content) ? content : content.split("\n");

  // Calculate width
  const maxContentWidth = Math.max(...lines.map((l) => stripAnsi(l).length));
  const width =
    targetWidth ||
    Math.min(maxContentWidth + padding * 2 + 2, getTerminalWidth() - 4);
  const innerWidth = width - 2;

  const output: string[] = [];

  // Top border with optional title
  let topBorder =
    chars.topLeft + chars.horizontal.repeat(innerWidth) + chars.topRight;
  if (title) {
    const titleText = ` ${title} `;
    const titleStart = Math.floor((innerWidth - titleText.length) / 2);
    topBorder =
      chars.topLeft +
      chars.horizontal.repeat(titleStart) +
      colors.primary(titleText) +
      chars.horizontal.repeat(innerWidth - titleStart - titleText.length) +
      chars.topRight;
  }
  output.push(color + topBorder + Style.RESET);

  // Padding top
  for (let i = 0; i < padding; i++) {
    output.push(
      color +
        chars.vertical +
        " ".repeat(innerWidth) +
        chars.vertical +
        Style.RESET,
    );
  }

  // Content lines
  for (const line of lines) {
    const strippedLength = stripAnsi(line).length;
    const alignHandler = ALIGN_HANDLERS[align];
    const paddedLine = alignHandler(line, innerWidth, strippedLength);

    output.push(
      color +
        chars.vertical +
        Style.RESET +
        paddedLine +
        color +
        chars.vertical +
        Style.RESET,
    );
  }

  // Padding bottom
  for (let i = 0; i < padding; i++) {
    output.push(
      color +
        chars.vertical +
        " ".repeat(innerWidth) +
        chars.vertical +
        Style.RESET,
    );
  }

  // Bottom border
  output.push(
    color +
      chars.bottomLeft +
      chars.horizontal.repeat(innerWidth) +
      chars.bottomRight +
      Style.RESET,
  );

  return output.join("\n");
};

/**
 * Create a panel (simpler than box, just left border)
 */
export const panel = (
  content: string | string[],
  color = Theme.textMuted,
): string => {
  const lines = Array.isArray(content) ? content : content.split("\n");
  return lines.map((l) => color + "│ " + Style.RESET + l).join("\n");
};

/**
 * Create an error display
 */
export const errorBox = (title: string, message: string): string =>
  box([colors.bold(colors.error(title)), "", message], {
    style: "rounded",
    color: Theme.error,
    padding: 1,
  });

/**
 * Create a success display
 */
export const successBox = (title: string, message: string): string =>
  box([colors.bold(colors.success(title)), "", message], {
    style: "rounded",
    color: Theme.success,
    padding: 1,
  });
