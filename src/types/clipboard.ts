/**
 * Clipboard types for text and image clipboard operations
 */

/** MIME types supported by clipboard operations */
export type ClipboardMime = "text/plain" | "image/png";

/** Content read from the clipboard */
export interface ClipboardContent {
  data: string;
  mime: ClipboardMime;
}

/** Platform-specific copy method signature */
export type CopyMethod = (text: string) => Promise<void>;
