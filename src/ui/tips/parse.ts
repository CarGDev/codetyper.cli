/**
 * Tip parsing utilities
 */

import { TIP_HIGHLIGHT_REGEX } from "@constants/tips";
import type { TipPart } from "@/types/components";

/**
 * Parse tip with highlights
 */
export const parseTip = (tip: string): TipPart[] => {
  const parts: TipPart[] = [];
  const regex = new RegExp(TIP_HIGHLIGHT_REGEX.source, "g");

  let lastIndex = 0;
  let match;

  while ((match = regex.exec(tip)) !== null) {
    // Add text before the highlight
    if (match.index > lastIndex) {
      parts.push({
        text: tip.slice(lastIndex, match.index),
        highlight: false,
      });
    }

    // Add highlighted text
    parts.push({
      text: match[1],
      highlight: true,
    });

    lastIndex = regex.lastIndex;
  }

  // Add remaining text
  if (lastIndex < tip.length) {
    parts.push({
      text: tip.slice(lastIndex),
      highlight: false,
    });
  }

  return parts;
};
