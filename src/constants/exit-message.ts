/**
 * Exit message constants for the post-exit banner
 *
 * Displayed after the TUI exits to show session info
 * and the resume command.
 */

/** Small block art logo (3 rows) used as visual marker */
export const EXIT_LOGO = [
  "█▀▀█",
  "█  █",
  "▀▀▀▀",
] as const;

/** ANSI style codes for exit message */
export const EXIT_STYLES = {
  RESET: "\x1b[0m",
  DIM: "\x1b[90m",
  HIGHLIGHT: "\x1b[96m",
  BOLD: "\x1b[1m",
  LOGO_COLOR: "\x1b[36m",
} as const;

/** Maximum width for the session description before truncation */
export const EXIT_DESCRIPTION_MAX_WIDTH = 50;

/** Padding before each exit message line */
export const EXIT_LINE_PADDING = "  ";

/** Gap between logo and text */
export const EXIT_LOGO_GAP = "  ";

/** Truncation indicator */
export const EXIT_TRUNCATION_MARKER = "\u2026";
