/**
 * Language Detection and Extension Mapping
 *
 * Maps file extensions to LSP language IDs
 */

export const LANGUAGE_EXTENSIONS: Record<string, string> = {
  // TypeScript/JavaScript
  ".ts": "typescript",
  ".tsx": "typescriptreact",
  ".js": "javascript",
  ".jsx": "javascriptreact",
  ".mjs": "javascript",
  ".cjs": "javascript",
  ".mts": "typescript",
  ".cts": "typescript",

  // Web
  ".html": "html",
  ".htm": "html",
  ".css": "css",
  ".scss": "scss",
  ".sass": "sass",
  ".less": "less",
  ".vue": "vue",
  ".svelte": "svelte",
  ".astro": "astro",

  // Python
  ".py": "python",
  ".pyi": "python",
  ".pyw": "python",

  // Go
  ".go": "go",
  ".mod": "go.mod",
  ".sum": "go.sum",

  // Rust
  ".rs": "rust",

  // C/C++
  ".c": "c",
  ".h": "c",
  ".cpp": "cpp",
  ".cxx": "cpp",
  ".cc": "cpp",
  ".hpp": "cpp",
  ".hxx": "cpp",
  ".hh": "cpp",

  // Java/Kotlin
  ".java": "java",
  ".kt": "kotlin",
  ".kts": "kotlin",

  // C#/F#
  ".cs": "csharp",
  ".fs": "fsharp",
  ".fsx": "fsharp",

  // Ruby
  ".rb": "ruby",
  ".rake": "ruby",
  ".gemspec": "ruby",

  // PHP
  ".php": "php",

  // Swift
  ".swift": "swift",

  // Lua
  ".lua": "lua",

  // Shell
  ".sh": "shellscript",
  ".bash": "shellscript",
  ".zsh": "shellscript",
  ".fish": "fish",

  // Data formats
  ".json": "json",
  ".jsonc": "jsonc",
  ".yaml": "yaml",
  ".yml": "yaml",
  ".toml": "toml",
  ".xml": "xml",

  // Markdown/Docs
  ".md": "markdown",
  ".mdx": "mdx",
  ".rst": "restructuredtext",

  // SQL
  ".sql": "sql",

  // Docker
  Dockerfile: "dockerfile",
  ".dockerfile": "dockerfile",

  // Config
  ".env": "dotenv",
  ".ini": "ini",
  ".conf": "conf",

  // Elixir
  ".ex": "elixir",
  ".exs": "elixir",

  // Zig
  ".zig": "zig",

  // Dart
  ".dart": "dart",

  // Haskell
  ".hs": "haskell",
  ".lhs": "haskell",

  // OCaml
  ".ml": "ocaml",
  ".mli": "ocaml",

  // Clojure
  ".clj": "clojure",
  ".cljs": "clojurescript",
  ".cljc": "clojure",

  // Scala
  ".scala": "scala",
  ".sc": "scala",

  // Erlang
  ".erl": "erlang",
  ".hrl": "erlang",

  // Nix
  ".nix": "nix",

  // Terraform
  ".tf": "terraform",
  ".tfvars": "terraform",

  // Prisma
  ".prisma": "prisma",

  // GraphQL
  ".graphql": "graphql",
  ".gql": "graphql",

  // Protobuf
  ".proto": "proto",

  // Makefile
  Makefile: "makefile",
  ".mk": "makefile",

  // Gleam
  ".gleam": "gleam",

  // Typst
  ".typ": "typst",
};

export const getLanguageId = (filePath: string): string | null => {
  const ext = filePath.includes(".")
    ? "." + filePath.split(".").pop()
    : (filePath.split("/").pop() ?? "");

  return (
    LANGUAGE_EXTENSIONS[ext] ??
    LANGUAGE_EXTENSIONS[filePath.split("/").pop() ?? ""] ??
    null
  );
};

export const getExtensionsForLanguage = (languageId: string): string[] => {
  return Object.entries(LANGUAGE_EXTENSIONS)
    .filter(([_, lang]) => lang === languageId)
    .map(([ext]) => ext);
};

export const getSupportedExtensions = (): string[] => {
  return Object.keys(LANGUAGE_EXTENSIONS);
};
