/**
 * Markdown → plain text transform for TUI rendering.
 *
 * Not a full parser — strips the common constructs so the output
 * reads cleanly in a terminal that does not render rich markdown.
 */

/**
 * Strip markdown syntax from complete text, keeping readable content.
 *
 * Rules applied (in order):
 *  - Fenced code blocks  ```lang\nCODE\n```  → CODE
 *  - Inline code          `x`                → x
 *  - Images               ![alt](url)        → alt
 *  - Links                [label](url)       → label (url)
 *  - Bold / italic        **x**  *x*  __x__  _x_  → x
 *  - Strikethrough        ~~x~~              → x
 *  - Headings             ### Heading        → Heading
 *  - Blockquotes          > text             → text
 *  - Horizontal rules     ---  ***  ___      → (removed)
 *  - Unordered lists      - item / * item    → • item
 *  - Ordered lists        1. item            → • item
 */
export const stripMarkdown = (text: string): string => {
  if (!text) return text;

  let result = text;

  // 1. Fenced code blocks — keep inner code, drop the fences + optional lang
  result = result.replace(/```[^\n]*\n([\s\S]*?)```/g, "$1");

  // 2. Inline code — keep content
  result = result.replace(/`([^`]+)`/g, "$1");

  // 3. Images — keep alt text
  result = result.replace(/!\[([^\]]*)\]\([^)]+\)/g, "$1");

  // 4. Links — keep label, append URL in parens
  result = result.replace(/\[([^\]]+)\]\(([^)]+)\)/g, "$1 ($2)");

  // 5. Bold + italic combos first, then bold, then italic
  //    Order matters: longest delimiters first to avoid partial matches.
  result = result.replace(/\*\*\*(.+?)\*\*\*/g, "$1");
  result = result.replace(/___(.+?)___/g, "$1");
  result = result.replace(/\*\*(.+?)\*\*/g, "$1");
  result = result.replace(/__(.+?)__/g, "$1");
  result = result.replace(/\*(.+?)\*/g, "$1");
  result = result.replace(/_(.+?)_/g, "$1");

  // 6. Strikethrough
  result = result.replace(/~~(.+?)~~/g, "$1");

  // 7. Headings — strip leading #'s and one optional space
  result = result.replace(/^#{1,6}\s+/gm, "");

  // 8. Blockquotes — strip leading > (possibly nested)
  result = result.replace(/^(>\s*)+/gm, "");

  // 9. Horizontal rules (standalone lines of ---, ***, ___)
  result = result.replace(/^[\s]*([-*_]){3,}\s*$/gm, "");

  // 10. Unordered list markers → bullet
  result = result.replace(/^(\s*)[-*+]\s+/gm, "$1• ");

  // 11. Ordered list markers → bullet
  result = result.replace(/^(\s*)\d+\.\s+/gm, "$1• ");

  return result;
};
