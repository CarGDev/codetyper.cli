/**
 * Progress bar utilities
 */

import { PROGRESS_BAR_DEFAULTS } from "@constants/spinner";
import { Style, Theme } from "@constants/styles";
import type { ProgressBarOptions } from "@interfaces/SpinnerOptions";

/**
 * Progress bar
 */
export const progressBar = (
  current: number,
  total: number,
  options: ProgressBarOptions = {},
): string => {
  const width = options.width || PROGRESS_BAR_DEFAULTS.width;
  const filledChar = options.chars?.filled || PROGRESS_BAR_DEFAULTS.filledChar;
  const emptyChar = options.chars?.empty || PROGRESS_BAR_DEFAULTS.emptyChar;

  const progress = Math.min(1, Math.max(0, current / total));
  const filledWidth = Math.round(progress * width);
  const emptyWidth = width - filledWidth;

  const filled = filledChar.repeat(filledWidth);
  const empty = emptyChar.repeat(emptyWidth);
  const percent = Math.round(progress * 100);

  return `${Theme.primary}${filled}${Style.RESET}${Style.DIM}${empty}${Style.RESET} ${percent}%`;
};
