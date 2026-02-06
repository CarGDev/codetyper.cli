/**
 * Thinking Parser
 *
 * Stateful streaming parser that strips XML thinking/reasoning tags
 * from LLM streaming output. Content inside these tags is accumulated
 * separately and emitted as thinking events.
 *
 * Handles partial chunks gracefully - if a chunk ends mid-tag (e.g. "<thin"),
 * the parser buffers it until the next chunk arrives.
 */

import {
  THINKING_TAGS,
  THINKING_BUFFER_MAX_SIZE,
} from "@constants/thinking-tags";
import type { ThinkingTagName } from "@constants/thinking-tags";

// =============================================================================
// Types
// =============================================================================

interface ThinkingParserResult {
  /** Visible content to display (tags stripped) */
  visible: string;
  /** Completed thinking block content, or null if none completed */
  thinking: string | null;
}

interface ThinkingParser {
  /** Feed a streaming chunk through the parser */
  feed: (chunk: string) => ThinkingParserResult;
  /** Flush any remaining buffered content */
  flush: () => ThinkingParserResult;
  /** Reset parser state for a new streaming session */
  reset: () => void;
}

type ParserState = "normal" | "buffering_tag" | "inside_tag";

// =============================================================================
// Tag Detection
// =============================================================================

const TAG_SET = new Set<string>(THINKING_TAGS);

const isKnownTag = (name: string): name is ThinkingTagName =>
  TAG_SET.has(name);

/**
 * Try to match an opening tag at a given position in the text.
 * Returns the tag name and end index, or null if no match.
 */
const matchOpenTag = (
  text: string,
  startIndex: number,
): { tag: ThinkingTagName; endIndex: number } | null => {
  for (const tag of THINKING_TAGS) {
    const pattern = `<${tag}>`;
    if (text.startsWith(pattern, startIndex)) {
      return { tag, endIndex: startIndex + pattern.length };
    }
  }
  return null;
};

/**
 * Try to match a closing tag for a specific tag name.
 * Returns the end index, or -1 if not found.
 */
const findCloseTag = (text: string, tagName: string): number => {
  const pattern = `</${tagName}>`;
  const index = text.indexOf(pattern);
  if (index === -1) return -1;
  return index;
};

/**
 * Check if text could be the start of a known opening tag.
 * E.g. "<th" could be the start of "<thinking>".
 */
const couldBeTagStart = (text: string): boolean => {
  if (!text.startsWith("<")) return false;

  const afterBracket = text.slice(1);

  for (const tag of THINKING_TAGS) {
    const fullOpen = `${tag}>`;
    if (fullOpen.startsWith(afterBracket)) return true;
  }

  return false;
};

// =============================================================================
// Parser Factory
// =============================================================================

export const createThinkingParser = (): ThinkingParser => {
  let state: ParserState = "normal";
  let buffer = "";
  let thinkingContent = "";
  let currentTag: ThinkingTagName | null = null;

  const makeResult = (
    visible: string,
    thinking: string | null,
  ): ThinkingParserResult => ({
    visible,
    thinking,
  });

  const processNormal = (text: string): ThinkingParserResult => {
    let visible = "";
    let completedThinking: string | null = null;
    let i = 0;

    while (i < text.length) {
      if (text[i] === "<") {
        const openMatch = matchOpenTag(text, i);

        if (openMatch) {
          state = "inside_tag";
          currentTag = openMatch.tag;
          thinkingContent = "";
          i = openMatch.endIndex;
          // Process the rest as inside_tag
          const remaining = text.slice(i);
          if (remaining.length > 0) {
            const innerResult = processInsideTag(remaining);
            completedThinking = innerResult.thinking;
            visible += innerResult.visible;
          }
          return makeResult(visible, completedThinking);
        }

        // Check if this could be the start of a tag (partial)
        const remainder = text.slice(i);
        if (couldBeTagStart(remainder) && remainder.length < longestOpenTag()) {
          // Buffer this partial potential tag
          state = "buffering_tag";
          buffer = remainder;
          return makeResult(visible, completedThinking);
        }

        // Not a known tag, emit the '<' as visible
        visible += "<";
        i++;
      } else {
        visible += text[i];
        i++;
      }
    }

    return makeResult(visible, completedThinking);
  };

  const processBufferingTag = (text: string): ThinkingParserResult => {
    buffer += text;

    // Check if we now have a complete opening tag
    const openMatch = matchOpenTag(buffer, 0);
    if (openMatch) {
      state = "inside_tag";
      currentTag = openMatch.tag;
      thinkingContent = "";
      const remaining = buffer.slice(openMatch.endIndex);
      buffer = "";
      if (remaining.length > 0) {
        return processInsideTag(remaining);
      }
      return makeResult("", null);
    }

    // Check if it can still become a valid tag
    if (couldBeTagStart(buffer) && buffer.length < longestOpenTag()) {
      // Still buffering
      return makeResult("", null);
    }

    // Safety: if buffer exceeds max size, flush as visible
    if (buffer.length >= THINKING_BUFFER_MAX_SIZE) {
      const flushed = buffer;
      buffer = "";
      state = "normal";
      return makeResult(flushed, null);
    }

    // Not a valid tag start, emit buffer as visible and process remaining
    const flushedBuffer = buffer;
    buffer = "";
    state = "normal";

    // Re-process what was in the buffer (minus the first char which is '<')
    // since the rest might contain another '<'
    if (flushedBuffer.length > 1) {
      const result = processNormal(flushedBuffer.slice(1));
      return makeResult("<" + result.visible, result.thinking);
    }

    return makeResult(flushedBuffer, null);
  };

  const processInsideTag = (text: string): ThinkingParserResult => {
    if (!currentTag) {
      state = "normal";
      return processNormal(text);
    }

    const closeIndex = findCloseTag(text, currentTag);

    if (closeIndex === -1) {
      // No closing tag yet, accumulate as thinking content
      thinkingContent += text;
      return makeResult("", null);
    }

    // Found closing tag
    thinkingContent += text.slice(0, closeIndex);
    const closingTagLength = `</${currentTag}>`.length;
    const afterClose = text.slice(closeIndex + closingTagLength);

    const completedThinking = thinkingContent.trim();
    thinkingContent = "";
    currentTag = null;
    state = "normal";

    // Process remaining content after the closing tag
    if (afterClose.length > 0) {
      const result = processNormal(afterClose);
      return makeResult(
        result.visible,
        completedThinking || result.thinking,
      );
    }

    return makeResult("", completedThinking || null);
  };

  const longestOpenTag = (): number => {
    let max = 0;
    for (const tag of THINKING_TAGS) {
      const len = tag.length + 2; // < + tag + >
      if (len > max) max = len;
    }
    return max;
  };

  const stateHandlers: Record<
    ParserState,
    (text: string) => ThinkingParserResult
  > = {
    normal: processNormal,
    buffering_tag: processBufferingTag,
    inside_tag: processInsideTag,
  };

  const feed = (chunk: string): ThinkingParserResult => {
    if (chunk.length === 0) return makeResult("", null);
    return stateHandlers[state](chunk);
  };

  const flush = (): ThinkingParserResult => {
    if (state === "buffering_tag" && buffer.length > 0) {
      const flushed = buffer;
      buffer = "";
      state = "normal";
      return makeResult(flushed, null);
    }

    if (state === "inside_tag" && thinkingContent.length > 0) {
      const thinking = thinkingContent.trim();
      thinkingContent = "";
      currentTag = null;
      state = "normal";
      return makeResult("", thinking || null);
    }

    return makeResult("", null);
  };

  const reset = (): void => {
    state = "normal";
    buffer = "";
    thinkingContent = "";
    currentTag = null;
  };

  return { feed, flush, reset };
};
