/**
 * View tool constants
 */

export const VIEW_MESSAGES = {
  FAILED: (error: unknown) => `Failed to read file: ${error}`,
} as const;

export const VIEW_DEFAULTS = {
  START_LINE: 1,
} as const;
