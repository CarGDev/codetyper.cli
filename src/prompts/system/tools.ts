/**
 * Tool Instructions Prompt
 *
 * Detailed instructions for using each tool effectively.
 */

export const BASH_TOOL_INSTRUCTIONS = `### Bash Tool

Executes shell commands with optional timeout.

**When to use**: Terminal operations like git, npm, docker, builds, tests.

**When NOT to use**: File operations (reading, writing, editing, searching).

**Guidelines**:
- Always quote file paths containing spaces with double quotes
- Use absolute paths when possible to maintain working directory
- For multiple independent commands, make parallel tool calls
- For dependent commands, chain with && in a single call
- Write a clear description of what the command does

**Examples**:
<example>
Good: pytest /foo/bar/tests
Bad: cd /foo/bar && pytest tests
</example>

<example>
Good: git add specific-file.ts && git commit -m "message"
Bad: git add . (may include unwanted files)
</example>`;

export const READ_TOOL_INSTRUCTIONS = `### Read Tool

Reads file contents from the filesystem.

**When to use**: View file contents, understand existing code before editing.

**Guidelines**:
- Can read any file by absolute path
- By default reads up to 2000 lines from the beginning
- Use offset and limit parameters for long files
- Can read images (PNG, JPG), PDFs, and Jupyter notebooks
- Line numbers start at 1
- Prefer reading specific files over using Bash with cat/head/tail`;

export const WRITE_TOOL_INSTRUCTIONS = `### Write Tool

Creates or overwrites files.

**When to use**: Create new files when absolutely necessary.

**Guidelines**:
- ALWAYS prefer editing existing files to creating new ones
- Will overwrite existing files - read first if the file exists
- NEVER proactively create documentation (*.md, README) files
- Only use emojis in file content if the user explicitly requests it`;

export const EDIT_TOOL_INSTRUCTIONS = `### Edit Tool

Performs exact string replacements in files.

**When to use**: Modify existing code, fix bugs, add features.

**Guidelines**:
- MUST read the file first before editing
- Preserve exact indentation from the file
- The old_string must be unique in the file
- If not unique, provide more surrounding context
- Use replace_all: true to replace all occurrences (e.g., renaming)
- Prefer editing over writing new files`;

export const GLOB_TOOL_INSTRUCTIONS = `### Glob Tool

Fast file pattern matching.

**When to use**: Find files by name patterns.

**Examples**:
- "**/*.ts" - all TypeScript files
- "src/**/*.tsx" - all TSX files in src
- "**/test*.ts" - all test files`;

export const GREP_TOOL_INSTRUCTIONS = `### Grep Tool

Search file contents with regex.

**When to use**: Find code patterns, search for implementations.

**Guidelines**:
- Supports full regex syntax (e.g., "function\\s+\\w+")
- Use glob parameter to filter file types (e.g., "*.ts")
- Output modes: "content" (matching lines), "files_with_matches" (file paths), "count"
- Use multiline: true for patterns spanning multiple lines`;

export const ALL_TOOL_INSTRUCTIONS = [
  BASH_TOOL_INSTRUCTIONS,
  READ_TOOL_INSTRUCTIONS,
  WRITE_TOOL_INSTRUCTIONS,
  EDIT_TOOL_INSTRUCTIONS,
  GLOB_TOOL_INSTRUCTIONS,
  GREP_TOOL_INSTRUCTIONS,
].join("\n\n");
