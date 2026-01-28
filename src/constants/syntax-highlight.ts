/**
 * Syntax highlighting constants
 */

/** Map file extensions to highlight.js language identifiers */
export const EXTENSION_TO_LANGUAGE: Record<string, string> = {
  // JavaScript/TypeScript
  ".js": "javascript",
  ".jsx": "javascript",
  ".ts": "typescript",
  ".tsx": "typescript",
  ".mjs": "javascript",
  ".cjs": "javascript",

  // Web
  ".html": "html",
  ".htm": "html",
  ".css": "css",
  ".scss": "scss",
  ".sass": "scss",
  ".less": "less",
  ".vue": "vue",
  ".svelte": "svelte",

  // Data formats
  ".json": "json",
  ".yaml": "yaml",
  ".yml": "yaml",
  ".toml": "toml",
  ".xml": "xml",
  ".csv": "plaintext",

  // Systems programming
  ".c": "c",
  ".h": "c",
  ".cpp": "cpp",
  ".cc": "cpp",
  ".cxx": "cpp",
  ".hpp": "cpp",
  ".rs": "rust",
  ".go": "go",
  ".zig": "zig",

  // JVM languages
  ".java": "java",
  ".kt": "kotlin",
  ".kts": "kotlin",
  ".scala": "scala",
  ".groovy": "groovy",
  ".gradle": "groovy",

  // .NET languages
  ".cs": "csharp",
  ".fs": "fsharp",
  ".vb": "vbnet",

  // Scripting
  ".py": "python",
  ".rb": "ruby",
  ".php": "php",
  ".pl": "perl",
  ".lua": "lua",
  ".r": "r",
  ".R": "r",

  // Shell
  ".sh": "bash",
  ".bash": "bash",
  ".zsh": "bash",
  ".fish": "fish",
  ".ps1": "powershell",
  ".psm1": "powershell",
  ".bat": "batch",
  ".cmd": "batch",

  // Config files
  ".conf": "nginx",
  ".ini": "ini",
  ".env": "bash",
  ".dockerfile": "dockerfile",
  ".gitignore": "plaintext",
  ".editorconfig": "ini",

  // Documentation
  ".md": "markdown",
  ".markdown": "markdown",
  ".rst": "plaintext",
  ".txt": "plaintext",

  // Database
  ".sql": "sql",
  ".prisma": "prisma",

  // Mobile
  ".swift": "swift",
  ".m": "objectivec",
  ".mm": "objectivec",
  ".dart": "dart",

  // Other
  ".ex": "elixir",
  ".exs": "elixir",
  ".erl": "erlang",
  ".hrl": "erlang",
  ".hs": "haskell",
  ".clj": "clojure",
  ".cljs": "clojure",
  ".elm": "elm",
  ".nim": "nim",
  ".v": "v",
  ".asm": "x86asm",
  ".s": "x86asm",
  ".wasm": "wasm",
  ".graphql": "graphql",
  ".gql": "graphql",
  ".tf": "hcl",
  ".hcl": "hcl",
  ".nix": "nix",
  ".proto": "protobuf",
} as const;

/** Special filename mappings */
export const FILENAME_TO_LANGUAGE: Record<string, string> = {
  Dockerfile: "dockerfile",
  Makefile: "makefile",
  "CMakeLists.txt": "cmake",
  Gemfile: "ruby",
  Rakefile: "ruby",
  Vagrantfile: "ruby",
  Brewfile: "ruby",
  ".bashrc": "bash",
  ".zshrc": "bash",
  ".bash_profile": "bash",
  ".profile": "bash",
  "package.json": "json",
  "tsconfig.json": "json",
  "jsconfig.json": "json",
  ".prettierrc": "json",
  ".eslintrc": "json",
  "nginx.conf": "nginx",
  "docker-compose.yml": "yaml",
  "docker-compose.yaml": "yaml",
} as const;

/** Human-readable language display names */
export const LANGUAGE_DISPLAY_NAMES: Record<string, string> = {
  javascript: "JavaScript",
  typescript: "TypeScript",
  python: "Python",
  java: "Java",
  cpp: "C++",
  csharp: "C#",
  go: "Go",
  rust: "Rust",
  ruby: "Ruby",
  php: "PHP",
  swift: "Swift",
  kotlin: "Kotlin",
  scala: "Scala",
  html: "HTML",
  css: "CSS",
  scss: "SCSS",
  json: "JSON",
  yaml: "YAML",
  markdown: "Markdown",
  bash: "Bash",
  sql: "SQL",
  dockerfile: "Dockerfile",
  graphql: "GraphQL",
} as const;
