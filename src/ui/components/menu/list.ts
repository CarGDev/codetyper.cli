/**
 * List and key-value display components
 */

import { Style, Theme, Icons } from "@constants/styles";
import type { KeyValueOptions, ListOptions } from "@interfaces/BoxOptions";

/**
 * Create a key-value display
 */
export const keyValue = (
  items: Record<string, string | number | boolean | undefined>,
  options: KeyValueOptions = {},
): string => {
  const {
    separator = ": ",
    labelColor = Theme.textMuted,
    valueColor = "",
  } = options;

  const output: string[] = [];

  for (const [key, value] of Object.entries(items)) {
    if (value === undefined) continue;
    const displayValue =
      typeof value === "boolean" ? (value ? "Yes" : "No") : String(value);
    output.push(
      labelColor +
        key +
        Style.RESET +
        separator +
        valueColor +
        displayValue +
        Style.RESET,
    );
  }

  return output.join("\n");
};

/**
 * Create a list
 */
export const list = (items: string[], options: ListOptions = {}): string => {
  const { bullet = Icons.bullet, indent = 2, color = Theme.primary } = options;
  const padding = " ".repeat(indent);
  return items
    .map((item) => padding + color + bullet + Style.RESET + " " + item)
    .join("\n");
};
