/**
 * Exit message formatter
 *
 * Formats the post-exit banner shown after the TUI closes,
 * displaying session info and the resume command.
 */

import { EOL } from "os";
import {
  EXIT_LOGO,
  EXIT_STYLES,
  EXIT_DESCRIPTION_MAX_WIDTH,
  EXIT_LINE_PADDING,
  EXIT_LOGO_GAP,
  EXIT_TRUNCATION_MARKER,
} from "@constants/exit-message";

/** Truncate text to a max width, appending ellipsis if needed */
const truncateText = (text: string, maxWidth: number): string => {
  if (text.length <= maxWidth) return text;
  return text.slice(0, maxWidth - 1) + EXIT_TRUNCATION_MARKER;
};

/** Format the exit banner with session info */
export const formatExitMessage = (
  sessionId?: string,
  sessionTitle?: string,
): string => {
  if (!sessionId) return "";

  const { RESET, DIM, HIGHLIGHT, LOGO_COLOR } = EXIT_STYLES;
  const pad = EXIT_LINE_PADDING;
  const gap = EXIT_LOGO_GAP;

  const description = sessionTitle
    ? truncateText(sessionTitle, EXIT_DESCRIPTION_MAX_WIDTH)
    : "";

  const resumeCommand = `codetyper --resume ${sessionId}`;

  const lines: string[] = [
    "",
    `${pad}${LOGO_COLOR}${EXIT_LOGO[0]}${RESET}${gap}${HIGHLIGHT}${description}${RESET}`,
    `${pad}${LOGO_COLOR}${EXIT_LOGO[1]}${RESET}${gap}${DIM}${resumeCommand}${RESET}`,
    `${pad}${LOGO_COLOR}${EXIT_LOGO[2]}${RESET}`,
    "",
  ];

  return lines.join(EOL);
};
