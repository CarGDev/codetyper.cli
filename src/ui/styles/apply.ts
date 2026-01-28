/**
 * Style application utilities
 */

import { Style } from "@constants/styles";

/**
 * Apply style to text
 */
export const style = (text: string, ...styles: string[]): string =>
  styles.join("") + text + Style.RESET;

/**
 * Create a colored text helper
 */
export const colored =
  (color: string): ((text: string) => string) =>
  (text: string) =>
    color + text + Style.RESET;
