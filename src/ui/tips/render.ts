/**
 * Tip rendering utilities
 */

import { TIPS, SHORTCUTS } from "@constants/tips";
import { Style, Theme, Icons } from "@constants/styles";
import { parseTip } from "@ui/tips/parse";

/**
 * Render a tip with colored highlights
 */
export const renderTip = (tip: string): string => {
  const parts = parseTip(tip);
  let output = "";

  for (const part of parts) {
    if (part.highlight) {
      output += Theme.primary + part.text + Style.RESET;
    } else {
      output += Theme.textMuted + part.text + Style.RESET;
    }
  }

  return output;
};

/**
 * Get a random tip
 */
export const getRandomTip = (): string => {
  const index = Math.floor(Math.random() * TIPS.length);
  return TIPS[index];
};

/**
 * Get a random tip, rendered with colors
 */
export const getRandomTipRendered = (): string => renderTip(getRandomTip());

/**
 * Format a tip line with bullet
 */
export const formatTipLine = (): string =>
  Theme.warning +
  Icons.bullet +
  " Tip: " +
  Style.RESET +
  getRandomTipRendered();

/**
 * Get all tips
 */
export const getAllTips = (): string[] => [...TIPS];

/**
 * Get all tips rendered
 */
export const getAllTipsRendered = (): string[] => TIPS.map(renderTip);

/**
 * Get tips matching a keyword
 */
export const searchTips = (keyword: string): string[] => {
  const lower = keyword.toLowerCase();
  return TIPS.filter((tip) => tip.toLowerCase().includes(lower));
};

/**
 * Get shortcuts formatted
 */
export const getShortcutsFormatted = (): string => {
  const maxKeyLen = Math.max(...SHORTCUTS.map((s) => s.key.length));
  return SHORTCUTS.map(
    (s) =>
      Theme.primary +
      s.key.padEnd(maxKeyLen + 2) +
      Style.RESET +
      Theme.textMuted +
      s.description +
      Style.RESET,
  ).join("\n");
};
