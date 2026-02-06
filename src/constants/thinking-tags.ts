/**
 * Thinking Tags Constants
 *
 * XML tag names that LLM providers use for reasoning/thinking blocks.
 * These should be stripped from visible streaming output and displayed
 * as dimmed thinking indicators instead.
 */

/** Tag names to strip from streaming content */
export const THINKING_TAGS = [
  "thinking",
  "search",
  "plan",
  "execute",
] as const;

export type ThinkingTagName = (typeof THINKING_TAGS)[number];

/** Regex pattern to match a complete opening tag: <thinking>, <search>, etc. */
export const THINKING_OPEN_TAG_REGEX = new RegExp(
  `<(${THINKING_TAGS.join("|")})>`,
);

/** Regex pattern to match a complete closing tag: </thinking>, </search>, etc. */
export const THINKING_CLOSE_TAG_REGEX = new RegExp(
  `</(${THINKING_TAGS.join("|")})>`,
);

/** Maximum buffer size before flushing as visible text (safety valve) */
export const THINKING_BUFFER_MAX_SIZE = 256;
