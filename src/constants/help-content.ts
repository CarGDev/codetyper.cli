/**
 * Help Content Constants
 *
 * Detailed help information for commands and features
 */

export interface HelpTopic {
  id: string;
  name: string;
  shortDescription: string;
  fullDescription: string;
  usage?: string;
  examples?: string[];
  shortcuts?: string[];
  category: HelpCategory;
}

export type HelpCategory = "commands" | "files" | "shortcuts";

export const HELP_CATEGORIES: Array<{
  id: HelpCategory;
  name: string;
  description: string;
}> = [
  {
    id: "commands",
    name: "Commands",
    description: "Slash commands for controlling the assistant",
  },
  {
    id: "files",
    name: "File References",
    description: "How to reference and work with files",
  },
  {
    id: "shortcuts",
    name: "Shortcuts",
    description: "Keyboard shortcuts",
  },
];

export const HELP_TOPICS: HelpTopic[] = [
  // Commands
  {
    id: "help",
    name: "/help",
    shortDescription: "Show this help menu",
    fullDescription:
      "Opens the help menu where you can browse commands and features.",
    usage: "/help",
    category: "commands",
  },
  {
    id: "clear",
    name: "/clear",
    shortDescription: "Clear conversation",
    fullDescription: "Clears the conversation history from the screen.",
    usage: "/clear",
    category: "commands",
  },
  {
    id: "save",
    name: "/save",
    shortDescription: "Save session",
    fullDescription: "Saves the current conversation session.",
    usage: "/save",
    category: "commands",
  },
  {
    id: "model",
    name: "/model",
    shortDescription: "Select AI model",
    fullDescription: "Opens menu to select which AI model to use.",
    usage: "/model",
    category: "commands",
  },
  {
    id: "provider",
    name: "/provider",
    shortDescription: "Switch provider",
    fullDescription: "Switch between LLM providers (Copilot, Ollama).",
    usage: "/provider",
    category: "commands",
  },
  {
    id: "mode",
    name: "/mode",
    shortDescription: "Switch mode",
    fullDescription:
      "Switch between Agent (full access), Ask (read-only), and Code Review modes.",
    usage: "/mode",
    shortcuts: ["Ctrl+M"],
    category: "commands",
  },
  {
    id: "theme",
    name: "/theme",
    shortDescription: "Change theme",
    fullDescription: "Opens menu to select a color theme.",
    usage: "/theme",
    category: "commands",
  },
  {
    id: "exit",
    name: "/exit",
    shortDescription: "Exit application",
    fullDescription: "Exits CodeTyper. You can also use Ctrl+C twice.",
    usage: "/exit",
    shortcuts: ["Ctrl+C twice"],
    category: "commands",
  },
  {
    id: "logs",
    name: "/logs",
    shortDescription: "Toggle debug logs",
    fullDescription:
      "Toggles the debug log panel on the right side of the screen. Shows API calls, streaming events, tool calls, and internal state changes for debugging.",
    usage: "/logs",
    category: "commands",
  },

  // Files
  {
    id: "file-ref",
    name: "@file",
    shortDescription: "Reference a file",
    fullDescription:
      "Type @ to open file picker and include file content in context.",
    usage: "@filename",
    examples: ["@src/index.ts", "@package.json"],
    category: "files",
  },
  {
    id: "file-glob",
    name: "@pattern",
    shortDescription: "Reference multiple files",
    fullDescription: "Use glob patterns to reference multiple files.",
    usage: "@pattern",
    examples: ["@src/**/*.ts", "@*.json"],
    category: "files",
  },

  // Shortcuts
  {
    id: "shortcut-slash",
    name: "/",
    shortDescription: "Open command menu",
    fullDescription: "Press / when input is empty to open command menu.",
    shortcuts: ["/"],
    category: "shortcuts",
  },
  {
    id: "shortcut-at",
    name: "@",
    shortDescription: "Open file picker",
    fullDescription: "Press @ to open the file picker.",
    shortcuts: ["@"],
    category: "shortcuts",
  },
  {
    id: "shortcut-ctrlc",
    name: "Ctrl+C",
    shortDescription: "Cancel/Exit",
    fullDescription: "Press once to cancel, twice to exit.",
    shortcuts: ["Ctrl+C"],
    category: "shortcuts",
  },
  {
    id: "shortcut-ctrlm",
    name: "Ctrl+M",
    shortDescription: "Cycle modes",
    fullDescription: "Cycle through interaction modes.",
    shortcuts: ["Ctrl+M"],
    category: "shortcuts",
  },
  {
    id: "shortcut-ctrlp",
    name: "Ctrl+P",
    shortDescription: "Pause/Resume",
    fullDescription:
      "Toggle pause/resume during agent execution. When paused, tool calls are suspended until resumed.",
    shortcuts: ["Ctrl+P"],
    category: "shortcuts",
  },
  {
    id: "shortcut-ctrlz",
    name: "Ctrl+Z",
    shortDescription: "Abort with rollback",
    fullDescription:
      "Abort current operation and rollback file changes made during this execution. Use to undo unwanted modifications.",
    shortcuts: ["Ctrl+Z"],
    category: "shortcuts",
  },
  {
    id: "shortcut-ctrlshifts",
    name: "Ctrl+Shift+S",
    shortDescription: "Toggle step mode",
    fullDescription:
      "Enable step-by-step mode where you can advance one tool call at a time. Press Enter to execute each tool.",
    shortcuts: ["Ctrl+Shift+S"],
    category: "shortcuts",
  },
];

export const getTopicsByCategory = (category: HelpCategory): HelpTopic[] =>
  HELP_TOPICS.filter((topic) => topic.category === category);

export const getTopicById = (id: string): HelpTopic | undefined =>
  HELP_TOPICS.find((topic) => topic.id === id);
