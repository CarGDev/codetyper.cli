/**
 * App Props Interface
 *
 * Props for the main TUI Application component
 */

import type { AgentConfig } from "@/types/agent-config";

export interface AppProps {
  /** Unique session identifier */
  sessionId: string;
  /** LLM provider name */
  provider: string;
  /** Model name */
  model: string;
  /** Current agent ID */
  agent?: string;
  /** Application version */
  version: string;
  /** Called when user submits a message */
  onSubmit: (message: string) => Promise<void>;
  /** Called when user exits the application */
  onExit: () => void;
  /** Called when user executes a slash command */
  onCommand?: (command: string) => Promise<void>;
  /** Called when user selects a model */
  onModelSelect?: (model: string) => void | Promise<void>;
  /** Called when user selects an agent */
  onAgentSelect?: (agentId: string, agent: AgentConfig) => void | Promise<void>;
  /** Called when user selects a theme */
  onThemeSelect?: (theme: string) => void | Promise<void>;
  /** Whether to show the banner on startup */
  showBanner?: boolean;
}
