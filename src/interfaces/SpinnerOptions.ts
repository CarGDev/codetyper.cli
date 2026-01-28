/**
 * Spinner options interface
 */

import type { SpinnerType } from "@/types/spinner";

export interface SpinnerOptions {
  type?: SpinnerType;
  color?: string;
  text?: string;
  interval?: number;
}

export interface ScannerOptions {
  width?: number;
  text?: string;
  char?: string;
}

export interface ProgressBarOptions {
  width?: number;
  chars?: {
    filled: string;
    empty: string;
  };
}
