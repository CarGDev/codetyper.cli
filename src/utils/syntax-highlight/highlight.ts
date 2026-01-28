/**
 * Code highlighting utilities
 */

import { highlight } from "cli-highlight";
import { detectLanguage } from "@utils/syntax-highlight/detect";

/**
 * Highlight a single line of code
 *
 * @param line - The code line to highlight
 * @param language - The programming language
 * @returns Highlighted line with ANSI codes
 */
export const highlightLine = (line: string, language?: string): string => {
  if (!language || !line.trim()) {
    return line;
  }

  try {
    // cli-highlight expects full code blocks, so we highlight and extract
    const highlighted = highlight(line, {
      language,
      ignoreIllegals: true,
    });
    return highlighted;
  } catch {
    // Return original line if highlighting fails
    return line;
  }
};

/**
 * Highlight a block of code
 *
 * @param code - The code to highlight
 * @param language - The programming language (auto-detected if not provided)
 * @param filePath - Optional file path for language detection
 * @returns Highlighted code with ANSI codes
 */
export const highlightCode = (
  code: string,
  language?: string,
  filePath?: string,
): string => {
  const lang = language || (filePath ? detectLanguage(filePath) : undefined);

  if (!lang) {
    return code;
  }

  try {
    return highlight(code, {
      language: lang,
      ignoreIllegals: true,
    });
  } catch {
    return code;
  }
};

/**
 * Highlight multiple lines while preserving line structure
 * Useful for diff views where each line needs individual highlighting
 *
 * @param lines - Array of code lines
 * @param language - The programming language
 * @returns Array of highlighted lines
 */
export const highlightLines = (
  lines: string[],
  language?: string,
): string[] => {
  if (!language || lines.length === 0) {
    return lines;
  }

  try {
    // Highlight the entire block to maintain context
    const fullCode = lines.join("\n");
    const highlighted = highlight(fullCode, {
      language,
      ignoreIllegals: true,
    });

    // Split back into lines
    return highlighted.split("\n");
  } catch {
    return lines;
  }
};
