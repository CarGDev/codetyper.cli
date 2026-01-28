/**
 * DiffView Component - Re-exports from modular implementation
 */

export { DiffView } from "@tui/components/diff-view/index";
export { DiffLine } from "@tui/components/diff-view/line-renderers";
export {
  parseDiffOutput,
  isDiffContent,
  stripAnsi,
} from "@tui/components/diff-view/utils";

// Re-export types for convenience
export type {
  DiffLineData,
  DiffViewProps,
  DiffLineProps,
  DiffLineType,
} from "@/types/tui";
