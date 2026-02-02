/**
 * Performance Reviewer
 *
 * Analyzes code for performance issues.
 */

import { MIN_CONFIDENCE_THRESHOLD, REVIEWER_PROMPTS } from "@constants/pr-review";
import type {
  PRReviewFinding,
  ParsedFileDiff,
  ReviewFileContext,
} from "@/types/pr-review";

/**
 * Performance patterns to check
 */
const PERFORMANCE_PATTERNS = {
  NESTED_LOOPS: {
    patterns: [
      /for\s*\([^)]+\)\s*\{[^}]*for\s*\([^)]+\)/,
      /\.forEach\([^)]+\)[^}]*\.forEach\(/,
      /\.map\([^)]+\)[^}]*\.map\(/,
      /while\s*\([^)]+\)\s*\{[^}]*while\s*\([^)]+\)/,
    ],
    message: "Nested loops detected - potential O(n²) complexity",
    suggestion: "Consider using a Map/Set for O(1) lookups or restructuring the algorithm",
    confidence: 75,
  },

  ARRAY_IN_LOOP: {
    patterns: [
      /for\s*\([^)]+\)\s*\{[^}]*\.includes\s*\(/,
      /for\s*\([^)]+\)\s*\{[^}]*\.indexOf\s*\(/,
      /\.forEach\([^)]+\)[^}]*\.includes\s*\(/,
      /\.map\([^)]+\)[^}]*\.indexOf\s*\(/,
    ],
    message: "Array search inside loop - O(n²) complexity",
    suggestion: "Convert array to Set for O(1) lookups before the loop",
    confidence: 85,
  },

  UNNECESSARY_RERENDER: {
    patterns: [
      /useEffect\s*\(\s*\([^)]*\)\s*=>\s*\{[^}]*\},\s*\[\s*\]\s*\)/,
      /useState\s*\(\s*\{/,
      /useState\s*\(\s*\[/,
      /style\s*=\s*\{\s*\{/,
    ],
    message: "Potential unnecessary re-render in React component",
    suggestion: "Use useMemo/useCallback for objects/arrays, extract styles outside component",
    confidence: 70,
  },

  MISSING_MEMO: {
    patterns: [
      /export\s+(?:default\s+)?function\s+\w+\s*\([^)]*\)\s*\{[^}]*return\s*\(/,
      /const\s+\w+\s*=\s*\([^)]*\)\s*=>\s*\{[^}]*return\s*\(/,
    ],
    message: "Component may benefit from React.memo",
    suggestion: "Consider wrapping with React.memo if props rarely change",
    confidence: 60, // Below threshold, informational only
  },

  N_PLUS_ONE_QUERY: {
    patterns: [
      /for\s*\([^)]+\)\s*\{[^}]*await\s+.*\.(find|query|get)/,
      /\.forEach\([^)]+\)[^}]*await\s+.*\.(find|query|get)/,
      /\.map\([^)]+\)[^}]*await\s+.*\.(find|query|get)/,
    ],
    message: "Potential N+1 query problem",
    suggestion: "Use batch queries or include/join to fetch related data",
    confidence: 85,
  },

  MEMORY_LEAK: {
    patterns: [
      /setInterval\s*\([^)]+\)/,
      /addEventListener\s*\([^)]+\)/,
      /subscribe\s*\([^)]+\)/,
    ],
    message: "Potential memory leak - subscription/interval without cleanup",
    suggestion: "Ensure cleanup in useEffect return or componentWillUnmount",
    confidence: 75,
  },

  LARGE_BUNDLE: {
    patterns: [
      /import\s+\*\s+as\s+\w+\s+from\s+['"]lodash['"]/,
      /import\s+\w+\s+from\s+['"]moment['"]/,
      /require\s*\(\s*['"]lodash['"]\s*\)/,
    ],
    message: "Large library import may increase bundle size",
    suggestion: "Use specific imports (lodash/get) or smaller alternatives (date-fns)",
    confidence: 80,
  },

  SYNC_FILE_OPERATION: {
    patterns: [
      /readFileSync\s*\(/,
      /writeFileSync\s*\(/,
      /readdirSync\s*\(/,
      /existsSync\s*\(/,
    ],
    message: "Synchronous file operation may block event loop",
    suggestion: "Use async versions (readFile, writeFile) for better performance",
    confidence: 80,
  },
} as const;

/**
 * Run performance review on a file
 */
export const reviewFile = (
  fileContext: ReviewFileContext,
): PRReviewFinding[] => {
  const findings: PRReviewFinding[] = [];
  const { diff, path } = fileContext;

  // Get all added lines
  const addedLines = getAllAddedLines(diff);

  // Combine lines for multi-line pattern matching
  const combinedContent = addedLines.map(l => l.content).join("\n");

  // Check each pattern
  for (const [patternName, config] of Object.entries(PERFORMANCE_PATTERNS)) {
    // Skip patterns below threshold
    if (config.confidence < MIN_CONFIDENCE_THRESHOLD) {
      continue;
    }

    for (const pattern of config.patterns) {
      // Check in combined content for multi-line patterns
      if (pattern.test(combinedContent)) {
        // Find the approximate line number
        const lineNumber = findPatternLine(addedLines, pattern);

        findings.push({
          id: generateFindingId(),
          type: "performance",
          severity: config.confidence >= 85 ? "warning" : "suggestion",
          file: path,
          line: lineNumber,
          message: config.message,
          details: `Pattern: ${patternName}`,
          suggestion: config.suggestion,
          confidence: config.confidence,
          reviewer: "performance",
        });
        break; // One finding per pattern type
      }
    }
  }

  return findings;
};

/**
 * Get all added lines with line numbers
 */
const getAllAddedLines = (
  diff: ParsedFileDiff,
): Array<{ content: string; lineNumber: number }> => {
  const lines: Array<{ content: string; lineNumber: number }> = [];

  for (const hunk of diff.hunks) {
    let lineNumber = hunk.newStart;

    for (const addition of hunk.additions) {
      lines.push({
        content: addition,
        lineNumber,
      });
      lineNumber++;
    }
  }

  return lines;
};

/**
 * Find the line number where a pattern matches
 */
const findPatternLine = (
  lines: Array<{ content: string; lineNumber: number }>,
  pattern: RegExp,
): number | undefined => {
  for (const { content, lineNumber } of lines) {
    if (pattern.test(content)) {
      return lineNumber;
    }
  }
  return lines.length > 0 ? lines[0].lineNumber : undefined;
};

/**
 * Generate unique finding ID
 */
const generateFindingId = (): string => {
  return `perf_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

/**
 * Get reviewer prompt
 */
export const getPrompt = (): string => {
  return REVIEWER_PROMPTS.performance;
};
