import { highlight } from "cli-highlight";
import { detectLanguage } from "@utils/syntax-highlight/detect";

export const highlightLine = (line: string, language?: string): string => {
  if (!language || !line.trim()) {
    return line;
  }

  try {
    // cli-highlight expects full code blocks, so we highlight and extract
    const highlighted = highlight(line, {
      language,
      ignoreIllegals: true,
    });
    return highlighted;
  } catch {
    // Return original line if highlighting fails
    return line;
  }
};

export const highlightCode = (
  code: string,
  language?: string,
  filePath?: string,
): string => {
  const lang = language || (filePath ? detectLanguage(filePath) : undefined);

  if (!lang) {
    return code;
  }

  try {
    return highlight(code, {
      language: lang,
      ignoreIllegals: true,
    });
  } catch {
    return code;
  }
};

export const highlightLines = (
  lines: string[],
  language?: string,
): string[] => {
  if (!language || lines.length === 0) {
    return lines;
  }

  try {
    // Highlight the entire block to maintain context
    const fullCode = lines.join("\n");
    const highlighted = highlight(fullCode, {
      language,
      ignoreIllegals: true,
    });

    // Split back into lines
    return highlighted.split("\n");
  } catch {
    return lines;
  }
};
