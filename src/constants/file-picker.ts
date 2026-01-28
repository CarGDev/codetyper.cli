/**
 * File Picker constants
 */

export const IGNORED_PATTERNS = [
  // Version control
  ".git",
  ".svn",
  ".hg",
  // AI/Code assistants
  ".claude",
  ".coder",
  ".codetyper",
  ".cursor",
  ".copilot",
  ".aider",
  // Build outputs / binaries
  "node_modules",
  "dist",
  "build",
  "bin",
  "obj",
  "target",
  ".next",
  ".nuxt",
  ".output",
  "out",
  // Cache directories
  ".cache",
  ".turbo",
  ".parcel-cache",
  ".vite",
  // Test/Coverage
  "coverage",
  ".nyc_output",
  // Python
  "__pycache__",
  ".venv",
  "venv",
  ".env",
  // OS files
  ".DS_Store",
  "thumbs.db",
  // IDE/Editor
  ".idea",
  ".vscode",
  // Misc
  ".terraform",
  ".serverless",
] as const;

export const BINARY_EXTENSIONS = [
  // Executables
  ".exe",
  ".dll",
  ".so",
  ".dylib",
  ".bin",
  ".app",
  // Images
  ".png",
  ".jpg",
  ".jpeg",
  ".gif",
  ".bmp",
  ".ico",
  ".webp",
  ".svg",
  ".tiff",
  // Audio/Video
  ".mp3",
  ".mp4",
  ".wav",
  ".avi",
  ".mov",
  ".mkv",
  ".flac",
  ".ogg",
  // Archives
  ".zip",
  ".tar",
  ".gz",
  ".rar",
  ".7z",
  ".bz2",
  // Documents
  ".pdf",
  ".doc",
  ".docx",
  ".xls",
  ".xlsx",
  ".ppt",
  ".pptx",
  // Fonts
  ".ttf",
  ".otf",
  ".woff",
  ".woff2",
  ".eot",
  // Database
  ".db",
  ".sqlite",
  ".sqlite3",
  // Other binary
  ".pyc",
  ".pyo",
  ".class",
  ".o",
  ".a",
  ".lib",
  ".node",
  ".wasm",
] as const;

export type BinaryExtension = (typeof BINARY_EXTENSIONS)[number];

export type IgnoredPattern = (typeof IGNORED_PATTERNS)[number];

export const FILE_PICKER_DEFAULTS = {
  MAX_DEPTH: 2,
  MAX_RESULTS: 15,
  INITIAL_DEPTH: 0,
} as const;
