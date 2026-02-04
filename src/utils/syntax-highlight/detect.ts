import { supportsLanguage } from "cli-highlight";
import {
  EXTENSION_TO_LANGUAGE,
  FILENAME_TO_LANGUAGE,
  LANGUAGE_DISPLAY_NAMES,
} from "@constants/syntax-highlight";

/**
 * Detect the programming language from a file path
 */
export const detectLanguage = (filePath: string): string | undefined => {
  if (!filePath) return undefined;

  // Check full filename first
  const filename = filePath.split("/").pop() || "";
  if (FILENAME_TO_LANGUAGE[filename]) {
    return FILENAME_TO_LANGUAGE[filename];
  }

  // Check extension
  const lastDot = filename.lastIndexOf(".");
  if (lastDot !== -1) {
    const ext = filename.slice(lastDot).toLowerCase();
    return EXTENSION_TO_LANGUAGE[ext];
  }

  return undefined;
};

/**
 * Check if a language is supported for highlighting
 */
export const isLanguageSupported = (language: string): boolean =>
  supportsLanguage(language);

/**
 * Get a human-readable language name
 */
export const getLanguageDisplayName = (language: string): string =>
  LANGUAGE_DISPLAY_NAMES[language] ||
  language.charAt(0).toUpperCase() + language.slice(1);
