/**
 * Home Screen Types
 * Type definitions for the welcome/home screen TUI
 */

/** Screen mode for determining which view to show */
export type ScreenMode = "home" | "session";

/** Props for HomeScreen component */
export interface HomeScreenProps {
  onSubmit: (message: string) => void;
  provider: string;
  model: string;
  agent: string;
  version: string;
  mcpConnectedCount?: number;
  mcpHasErrors?: boolean;
}

/** Props for Logo component */
export interface LogoProps {
  className?: string;
}

/** Props for HomeFooter component */
export interface HomeFooterProps {
  directory: string;
  mcpConnectedCount: number;
  mcpHasErrors: boolean;
  version: string;
}

/** Props for PromptBox component */
export interface PromptBoxProps {
  onSubmit: (message: string) => void;
  placeholder?: string;
}

/** Props for SessionHeader component */
export interface SessionHeaderProps {
  title: string;
  tokenCount: number;
  contextPercentage?: number;
  cost: number;
  version: string;
}
