/**
 * Syntax Highlighting Utility
 *
 * Provides terminal-friendly syntax highlighting for code
 * using cli-highlight with language auto-detection.
 */

export {
  detectLanguage,
  isLanguageSupported,
  getLanguageDisplayName,
} from "@utils/syntax-highlight/detect";

export {
  highlightLine,
  highlightCode,
  highlightLines,
} from "@utils/syntax-highlight/highlight";
