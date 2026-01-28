/**
 * Whimsical status messages for different operations
 */

// General thinking messages
export const THINKING_MESSAGES = [
  "Pondering",
  "Contemplating",
  "Cogitating",
  "Ruminating",
  "Deliberating",
  "Musing",
  "Brainstorming",
  "Noodling",
  "Percolating",
  "Synthesizing",
  "Ideating",
  "Mulling it over",
  "Connecting dots",
  "Brewing thoughts",
  "Hatching ideas",
] as const;

// Tool-specific messages
export const BASH_MESSAGES = [
  "Executing",
  "Running",
  "Invoking",
  "Launching",
  "Firing up",
  "Spinning up",
  "Kickstarting",
] as const;

export const READ_MESSAGES = [
  "Reading",
  "Scanning",
  "Perusing",
  "Examining",
  "Inspecting",
  "Analyzing",
  "Studying",
  "Digesting",
] as const;

export const WRITE_MESSAGES = [
  "Writing",
  "Crafting",
  "Composing",
  "Authoring",
  "Scribing",
  "Generating",
  "Creating",
  "Materializing",
] as const;

export const EDIT_MESSAGES = [
  "Editing",
  "Refining",
  "Polishing",
  "Tweaking",
  "Adjusting",
  "Massaging",
  "Tuning",
  "Perfecting",
] as const;

export const GLOB_MESSAGES = [
  "Searching",
  "Hunting",
  "Scouring",
  "Exploring",
  "Traversing",
  "Scanning",
] as const;

export const GREP_MESSAGES = [
  "Grepping",
  "Searching",
  "Pattern matching",
  "Filtering",
  "Sifting through",
] as const;

export const TOOL_MESSAGES: Record<string, readonly string[]> = {
  bash: BASH_MESSAGES,
  read: READ_MESSAGES,
  write: WRITE_MESSAGES,
  edit: EDIT_MESSAGES,
  glob: GLOB_MESSAGES,
  grep: GREP_MESSAGES,
};

// Fallback messages for unknown tools
export const GENERIC_TOOL_MESSAGES = [
  "Processing",
  "Working on",
  "Handling",
  "Tackling",
  "Attending to",
  "Taking care of",
] as const;

// Fun filler words that can be combined
export const FILLER_ACTIONS = [
  "Flibbertigibbeting",
  "Discombobulating",
  "Recalibrating",
  "Defenestrating bugs",
  "Wrangling bits",
  "Herding electrons",
  "Caffeinating",
  "Quantum entangling",
  "Reverse engineering gravity",
  "Consulting the oracle",
  "Aligning chakras",
  "Summoning expertise",
  "Channeling wisdom",
  "Marshalling resources",
  "Orchestrating magic",
] as const;

// Messages for specific file types
export const FILE_TYPE_MESSAGES: Record<string, string[]> = {
  ts: ["TypeScripting", "Type-checking", "Transpiling thoughts"],
  tsx: ["Rendering components", "JSX-ing", "Reactifying"],
  js: ["JavaScripting", "Interpreting"],
  json: ["Parsing JSON", "Structuring data"],
  md: ["Marking down", "Documenting"],
  css: ["Styling", "Beautifying"],
  html: ["Marking up", "Structuring"],
  py: ["Pythoning", "Slithering through code"],
  rs: ["Rusting", "Borrowing safely"],
  go: ["Going", "Goroutining"],
  sql: ["Querying", "Selecting wisdom"],
  yaml: ["YAMLing", "Indenting carefully"],
  toml: ["TOMLing", "Configuring"],
  sh: ["Shelling", "Bashing"],
};

/**
 * Get a random message from an array
 */
function randomFrom<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

/**
 * Get a thinking message
 */
export function getThinkingMessage(): string {
  // 20% chance of a fun filler message
  if (Math.random() < 0.2) {
    return `✻ ${randomFrom(FILLER_ACTIONS)}…`;
  }
  return `✻ ${randomFrom(THINKING_MESSAGES)}…`;
}

/**
 * Get a tool execution message based on tool name and optional file path
 */
export function getToolMessage(toolName: string, filePath?: string): string {
  // Check for file-type specific messages
  if (filePath) {
    const ext = filePath.split(".").pop()?.toLowerCase();
    if (ext && FILE_TYPE_MESSAGES[ext]) {
      return `✻ ${randomFrom(FILE_TYPE_MESSAGES[ext])}…`;
    }
  }

  // Get tool-specific messages
  const messages = TOOL_MESSAGES[toolName] || GENERIC_TOOL_MESSAGES;
  return `✻ ${randomFrom(messages)}…`;
}

/**
 * Get a contextual message based on what's happening
 */
export function getContextualMessage(context: {
  mode: "thinking" | "tool_execution";
  toolName?: string;
  filePath?: string;
  description?: string;
}): string {
  if (context.mode === "thinking") {
    return getThinkingMessage();
  }

  if (context.toolName) {
    return getToolMessage(context.toolName, context.filePath);
  }

  return `✻ ${randomFrom(GENERIC_TOOL_MESSAGES)}…`;
}

/**
 * Status message rotator - cycles through messages at intervals
 */
export class StatusMessageRotator {
  private intervalId: ReturnType<typeof setInterval> | null = null;
  private currentMode: "thinking" | "tool_execution" = "thinking";
  private toolContext: { name?: string; path?: string } = {};

  start(onMessage: (message: string) => void, intervalMs = 3000): void {
    this.stop();

    // Emit initial message
    onMessage(this.getMessage());

    // Rotate messages
    this.intervalId = setInterval(() => {
      onMessage(this.getMessage());
    }, intervalMs);
  }

  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  setMode(mode: "thinking" | "tool_execution"): void {
    this.currentMode = mode;
  }

  setToolContext(name?: string, path?: string): void {
    this.toolContext = { name, path };
  }

  private getMessage(): string {
    return getContextualMessage({
      mode: this.currentMode,
      toolName: this.toolContext.name,
      filePath: this.toolContext.path,
    });
  }
}
