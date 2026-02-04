/**
 * Banner logo utilities
 */

import { Style } from "@ui/core/styles";

/**
 * Simple logo for inline display
 */
export const getInlineLogo = (): string =>
  Style.CYAN + Style.BOLD + "codetyper" + Style.RESET;
