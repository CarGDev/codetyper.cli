/**
 * Unified clipboard reader - Attempts image first, then text fallback
 *
 * Combines image reading (from existing clipboard-service patterns)
 * with text reading to provide a single readClipboard entry point.
 */

import type { ClipboardContent } from "@/types/clipboard";
import {
  CLIPBOARD_MIME_TEXT,
  CLIPBOARD_MIME_IMAGE_PNG,
} from "@constants/clipboard";
import { readClipboardImage } from "@services/clipboard-service";
import { readClipboardText } from "@services/clipboard/text-clipboard";

/**
 * Read clipboard content, attempting image first then text fallback.
 * Returns ClipboardContent with appropriate MIME type, or null if empty.
 */
export const readClipboard = async (): Promise<ClipboardContent | null> => {
  const image = await readClipboardImage();

  if (image) {
    return {
      data: image.data,
      mime: CLIPBOARD_MIME_IMAGE_PNG,
    };
  }

  const text = await readClipboardText();

  if (text) {
    return {
      data: text,
      mime: CLIPBOARD_MIME_TEXT,
    };
  }

  return null;
};
