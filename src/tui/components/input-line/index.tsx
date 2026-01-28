/**
 * Input Line Component with Styled Placeholders
 */

import React from "react";
import { Text } from "ink";
import type { PastedContent } from "@interfaces/PastedContent";

type InputLineProps = {
  line: string;
  lineIndex: number;
  lineStartPos: number;
  cursorLine: number;
  cursorCol: number;
  pastedBlocks: Map<string, PastedContent>;
  colors: {
    primary: string;
    bgCursor: string;
    textDim: string;
    secondary: string;
  };
};

type Segment = {
  text: string;
  isPasted: boolean;
  startPos: number;
  endPos: number;
};

/**
 * Splits a line into segments, identifying pasted placeholders
 */
const segmentLine = (
  line: string,
  lineStartPos: number,
  pastedBlocks: Map<string, PastedContent>,
): Segment[] => {
  const segments: Segment[] = [];
  const lineEndPos = lineStartPos + line.length;

  // Find all pasted blocks that overlap with this line
  const overlappingBlocks: PastedContent[] = [];
  for (const block of pastedBlocks.values()) {
    if (block.startPos < lineEndPos && block.endPos > lineStartPos) {
      overlappingBlocks.push(block);
    }
  }

  if (overlappingBlocks.length === 0) {
    return [
      {
        text: line,
        isPasted: false,
        startPos: lineStartPos,
        endPos: lineEndPos,
      },
    ];
  }

  // Sort blocks by start position
  overlappingBlocks.sort((a, b) => a.startPos - b.startPos);

  let currentPos = lineStartPos;

  for (const block of overlappingBlocks) {
    // Add text before this block
    if (currentPos < block.startPos && block.startPos <= lineEndPos) {
      const beforeEnd = Math.min(block.startPos, lineEndPos);
      const textStart = currentPos - lineStartPos;
      const textEnd = beforeEnd - lineStartPos;
      segments.push({
        text: line.slice(textStart, textEnd),
        isPasted: false,
        startPos: currentPos,
        endPos: beforeEnd,
      });
      currentPos = beforeEnd;
    }

    // Add the pasted block portion within this line
    const blockStart = Math.max(block.startPos, lineStartPos);
    const blockEnd = Math.min(block.endPos, lineEndPos);
    if (blockStart < blockEnd) {
      const textStart = blockStart - lineStartPos;
      const textEnd = blockEnd - lineStartPos;
      segments.push({
        text: line.slice(textStart, textEnd),
        isPasted: true,
        startPos: blockStart,
        endPos: blockEnd,
      });
      currentPos = blockEnd;
    }
  }

  // Add remaining text after all blocks
  if (currentPos < lineEndPos) {
    const textStart = currentPos - lineStartPos;
    segments.push({
      text: line.slice(textStart),
      isPasted: false,
      startPos: currentPos,
      endPos: lineEndPos,
    });
  }

  return segments;
};

export function InputLine({
  line,
  lineIndex,
  lineStartPos,
  cursorLine,
  cursorCol,
  pastedBlocks,
  colors,
}: InputLineProps): React.ReactElement {
  const isCursorLine = lineIndex === cursorLine;
  const segments = segmentLine(line, lineStartPos, pastedBlocks);

  // If this is the cursor line, we need to handle cursor rendering within segments
  if (isCursorLine) {
    return (
      <Text>
        {segments.map((segment, segIdx) => {
          const segmentStartInLine = segment.startPos - lineStartPos;
          const segmentEndInLine = segment.endPos - lineStartPos;
          const cursorInSegment =
            cursorCol >= segmentStartInLine && cursorCol < segmentEndInLine;

          if (cursorInSegment) {
            const cursorPosInSegment = cursorCol - segmentStartInLine;
            const beforeCursor = segment.text.slice(0, cursorPosInSegment);
            const atCursor = segment.text[cursorPosInSegment] ?? " ";
            const afterCursor = segment.text.slice(cursorPosInSegment + 1);

            return (
              <Text key={segIdx}>
                {segment.isPasted ? (
                  <>
                    <Text color={colors.secondary} dimColor>
                      {beforeCursor}
                    </Text>
                    <Text backgroundColor={colors.bgCursor} color="black">
                      {atCursor}
                    </Text>
                    <Text color={colors.secondary} dimColor>
                      {afterCursor}
                    </Text>
                  </>
                ) : (
                  <>
                    {beforeCursor}
                    <Text backgroundColor={colors.bgCursor} color="black">
                      {atCursor}
                    </Text>
                    {afterCursor}
                  </>
                )}
              </Text>
            );
          }

          // Cursor is not in this segment
          if (segment.isPasted) {
            return (
              <Text key={segIdx} color={colors.secondary} dimColor>
                {segment.text}
              </Text>
            );
          }

          return <Text key={segIdx}>{segment.text}</Text>;
        })}
        {/* Handle cursor at end of line */}
        {cursorCol >= line.length && (
          <Text backgroundColor={colors.bgCursor} color="black">
            {" "}
          </Text>
        )}
      </Text>
    );
  }

  // Non-cursor line - simple rendering
  return (
    <Text>
      {segments.map((segment, segIdx) =>
        segment.isPasted ? (
          <Text key={segIdx} color={colors.secondary} dimColor>
            {segment.text}
          </Text>
        ) : (
          <Text key={segIdx}>{segment.text}</Text>
        ),
      )}
    </Text>
  );
}

/**
 * Calculates the starting position of a line in the buffer
 */
export const calculateLineStartPos = (
  buffer: string,
  lineIndex: number,
): number => {
  const lines = buffer.split("\n");
  let pos = 0;
  for (let i = 0; i < lineIndex && i < lines.length; i++) {
    pos += lines[i].length + 1; // +1 for newline
  }
  return pos;
};
