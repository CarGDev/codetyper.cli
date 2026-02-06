/**
 * Clipboard constants for text copy/read operations
 */

/** OSC 52 escape sequence for clipboard write (insert base64 payload) */
export const OSC52_SEQUENCE_PREFIX = "\x1b]52;c;";
export const OSC52_SEQUENCE_SUFFIX = "\x07";

/** DCS tmux passthrough wrapping */
export const TMUX_DCS_PREFIX = "\x1bPtmux;\x1b";
export const TMUX_DCS_SUFFIX = "\x1b\\";

/** Environment variables indicating tmux/screen session */
export const TMUX_ENV_VAR = "TMUX";
export const SCREEN_ENV_VAR = "STY";
export const WAYLAND_DISPLAY_ENV_VAR = "WAYLAND_DISPLAY";

/** Platform command timeout in milliseconds */
export const CLIPBOARD_COMMAND_TIMEOUT_MS = 5000;

/** Supported MIME types for clipboard content */
export const CLIPBOARD_MIME_TEXT = "text/plain" as const;
export const CLIPBOARD_MIME_IMAGE_PNG = "image/png" as const;
