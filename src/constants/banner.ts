/**
 * Banner constants for CodeTyper CLI
 */

// ASCII art for "codetyper" using block characters
export const BANNER_LINES = [
  "                 __     __                        ",
  "  _______  _____/ /__  / /___  ______  ___  _____ ",
  " / ___/ / / / _ \\/ _ \\/ __/ / / / __ \\/ _ \\/ ___/ ",
  "/ /__/ /_/ /  __/  __/ /_/ /_/ / /_/ /  __/ /     ",
  "\\___/\\____/\\___/\\___/\\__/\\__, / .___/\\___/_/      ",
  "                        /____/_/                  ",
] as const;

// Alternative minimal banner
export const BANNER_MINIMAL = [
  "╭───────────────────────────────────────╮",
  "│  ▄▀▀ ▄▀▄ █▀▄ ██▀ ▀█▀ ▀▄▀ █▀▄ ██▀ █▀▄  │",
  "│  ▀▄▄ ▀▄▀ █▄▀ █▄▄  █   █  █▀  █▄▄ █▀▄  │",
  "╰───────────────────────────────────────╯",
] as const;

// Block-style banner (similar to opencode)
export const BANNER_BLOCKS = [
  "█▀▀ █▀█ █▀▄ █▀▀ ▀█▀ █▄█ █▀█ █▀▀ █▀█",
  "█   █ █ █ █ █▀▀  █   █  █▀▀ █▀▀ █▀▄",
  "▀▀▀ ▀▀▀ ▀▀  ▀▀▀  ▀   ▀  ▀   ▀▀▀ ▀ ▀",
] as const;

// Gradient colors for banner (cyan to blue)
export const GRADIENT_COLORS = [
  "\x1b[96m", // Bright cyan
  "\x1b[36m", // Cyan
  "\x1b[94m", // Bright blue
  "\x1b[34m", // Blue
  "\x1b[95m", // Bright magenta
  "\x1b[35m", // Magenta
] as const;

// Banner style to lines mapping
export const BANNER_STYLE_MAP: Record<string, readonly string[]> = {
  default: BANNER_LINES,
  minimal: BANNER_MINIMAL,
  blocks: BANNER_BLOCKS,
} as const;

// Large ASCII art banner
export const BANNER = `
    ,gggg,     _,gggggg,_      ,gggggggggggg,      ,ggggggg,  ,ggggggggggggggg ,ggg,         gg  ,ggggggggggg,     ,ggggggg,  ,ggggggggggg,
   ,88"""Y8b, ,d8P""d8P"Y8b,   dP"""88""""""Y8b,  ,dP"""""""Y8bdP""""""88"""""""dP""Y8a        88 dP"""88""""""Y8, ,dP"""""""Y8bdP"""88""""""Y8,
  d8"     \`Y8,d8'   Y8   "8b,dPYb,  88       \`8b, d8'    a  Y8Yb,_    88       Yb, \`88        88 Yb,  88      \`8b d8'    a  Y8Yb,  88      \`8b
 d8'   8b  d8d8'    \`Ybaaad88P' \`"  88        \`8b 88     "Y8P' \`""    88        \`"  88        88  \`"  88      ,8P 88     "Y8P' \`"  88      ,8P
,8I    "Y88P'8P       \`"""Y8       88         Y8 \`8baaaa             88            88        88      88aaaad8P"  \`8baaaa          88aaaad8P"
I8'          8b            d8       88         d8,d8P""""             88            88        88      88"""""    ,d8P""""          88""""Yb,
d8           Y8,          ,8P       88        ,8Pd8"                  88            88       ,88      88         d8"               88     "8b
Y8,          \`Y8,        ,8P'       88       ,8P'Y8,            gg,   88            Y8b,___,d888      88         Y8,               88      \`8i
\`Yba,,_____,  \`Y8b,,__,,d8P'        88______,dP' \`Yba,,_____,    "Yb,,8P             "Y88888P"88,     88         \`Yba,,_____,      88       Yb,
  \`"Y8888888    \`"Y8888P"'         888888888P"     \`"Y8888888      "Y8P'                  ,ad8888     88           \`"Y8888888      88        Y8
                                                                                         d8P" 88
                                                                                       ,d8'   88
                                                                                       d8'    88
                                                                                       88     88
                                                                                       Y8,_ _,88
                                                                                        "Y888P"
`;

// Welcome message with help information
export const WELCOME_MESSAGE = `
🤖 CodeTyper AI Agent - Autonomous Code Generation Assistant
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Default Provider: GitHub Copilot (gpt-4)

Getting Started:
  codetyper chat                  Start interactive chat
  codetyper run "your task"       Execute autonomous task
  codetyper classify "prompt"     Analyze intent
  codetyper config show           View configuration

Commands:
  chat                            Interactive REPL session
  run <task>                      Execute task autonomously
  classify <prompt>               Classify user intent
  plan <intent>                   Generate execution plan
  validate <plan>                 Validate plan safety
  config                          Manage configuration
  serve                           Start JSON-RPC server

Options:
  --help, -h                      Show help
  --version, -V                   Show version

Chat Commands:
  /help       Show help
  /models     View available LLM providers
  /provider   Switch LLM provider
  /files      List context files
  /clear      Clear conversation
  /exit       Exit chat

💡 Tip: Use 'codetyper chat' then '/models' to see all available providers
📖 Docs: Run 'codetyper --help <command>' for detailed information
`;
