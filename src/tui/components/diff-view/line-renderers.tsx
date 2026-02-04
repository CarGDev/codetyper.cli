/**
 * Diff Line Renderer Components
 *
 * Each diff line type has its own renderer function
 */

import React from "react";
import { Box, Text, Transform } from "ink";
import type { DiffLineData, DiffLineProps, DiffLineType } from "@/types/tui";
import { highlightLine } from "@utils/syntax-highlight/highlight";

// ============================================================================
// Utility Components
// ============================================================================

interface HighlightedCodeProps {
  content: string;
  language?: string;
}

const HighlightedCode = ({
  content,
  language,
}: HighlightedCodeProps): React.ReactElement => {
  if (!language || !content.trim()) {
    return <Text>{content}</Text>;
  }

  const highlighted = highlightLine(content, language);

  // Transform passes through the ANSI codes from cli-highlight
  return (
    <Transform transform={(output) => output}>
      <Text>{highlighted}</Text>
    </Transform>
  );
};

// ============================================================================
// Line Number Formatting
// ============================================================================

const padNum = (num: number | undefined, width: number): string => {
  if (num === undefined) return " ".repeat(width);
  return String(num).padStart(width, " ");
};

// ============================================================================
// Line Renderers by Type
// ============================================================================

type LineRendererContext = {
  showLineNumbers: boolean;
  maxLineNumWidth: number;
  language?: string;
};

const renderHeaderLine = (line: DiffLineData): React.ReactElement => (
  <Box>
    <Text color="white" bold>
      {line.content}
    </Text>
  </Box>
);

const renderHunkLine = (line: DiffLineData): React.ReactElement => (
  <Box marginTop={1}>
    <Text color="cyan" dimColor>
      {line.content}
    </Text>
  </Box>
);

const renderAddLine = (
  line: DiffLineData,
  ctx: LineRendererContext,
): React.ReactElement => (
  <Box>
    {ctx.showLineNumbers && (
      <>
        <Text color="gray" dimColor>
          {" ".repeat(ctx.maxLineNumWidth)}
        </Text>
        <Text color="gray" dimColor>
          {" "}
          │{" "}
        </Text>
        <Text color="green">
          {padNum(line.newLineNum, ctx.maxLineNumWidth)}
        </Text>
        <Text color="gray" dimColor>
          {" "}
          │{" "}
        </Text>
      </>
    )}
    <Text backgroundColor="#1a3d1a" color="white">
      +{line.content}
    </Text>
  </Box>
);

const renderRemoveLine = (
  line: DiffLineData,
  ctx: LineRendererContext,
): React.ReactElement => (
  <Box>
    {ctx.showLineNumbers && (
      <>
        <Text color="red">{padNum(line.oldLineNum, ctx.maxLineNumWidth)}</Text>
        <Text color="gray" dimColor>
          {" "}
          │{" "}
        </Text>
        <Text color="gray" dimColor>
          {" ".repeat(ctx.maxLineNumWidth)}
        </Text>
        <Text color="gray" dimColor>
          {" "}
          │{" "}
        </Text>
      </>
    )}
    <Text backgroundColor="#3d1a1a" color="white">
      -{line.content}
    </Text>
  </Box>
);

const renderContextLine = (
  line: DiffLineData,
  ctx: LineRendererContext,
): React.ReactElement => (
  <Box>
    {ctx.showLineNumbers && (
      <>
        <Text color="gray" dimColor>
          {padNum(line.oldLineNum, ctx.maxLineNumWidth)}
        </Text>
        <Text color="gray" dimColor>
          {" "}
          │{" "}
        </Text>
        <Text color="gray" dimColor>
          {padNum(line.newLineNum, ctx.maxLineNumWidth)}
        </Text>
        <Text color="gray" dimColor>
          {" "}
          │{" "}
        </Text>
      </>
    )}
    <Text color="gray"> </Text>
    <HighlightedCode content={line.content} language={ctx.language} />
  </Box>
);

const renderSummaryLine = (): React.ReactElement => (
  <Box marginTop={1}>
    <Text dimColor>──────────────────────────────────────</Text>
  </Box>
);

const renderDefaultLine = (line: DiffLineData): React.ReactElement => (
  <Box>
    <Text>{line.content}</Text>
  </Box>
);

// ============================================================================
// Line Renderer Registry
// ============================================================================

type SimpleLineRenderer = (line: DiffLineData) => React.ReactElement;
type ContextLineRenderer = (
  line: DiffLineData,
  ctx: LineRendererContext,
) => React.ReactElement;

const SIMPLE_LINE_RENDERERS: Partial<Record<DiffLineType, SimpleLineRenderer>> =
  {
    header: renderHeaderLine,
    hunk: renderHunkLine,
    summary: renderSummaryLine,
  };

const CONTEXT_LINE_RENDERERS: Partial<
  Record<DiffLineType, ContextLineRenderer>
> = {
  add: renderAddLine,
  remove: renderRemoveLine,
  context: renderContextLine,
};

// ============================================================================
// Main Export
// ============================================================================

export function DiffLine({
  line,
  showLineNumbers,
  maxLineNumWidth,
  language,
}: DiffLineProps): React.ReactElement {
  // Try simple renderers first (no context needed)
  const simpleRenderer = SIMPLE_LINE_RENDERERS[line.type];
  if (simpleRenderer) {
    return simpleRenderer(line);
  }

  // Try context-aware renderers
  const contextRenderer = CONTEXT_LINE_RENDERERS[line.type];
  if (contextRenderer) {
    return contextRenderer(line, {
      showLineNumbers,
      maxLineNumWidth,
      language,
    });
  }

  // Default fallback
  return renderDefaultLine(line);
}
