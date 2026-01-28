/**
 * Spinner types
 */

import type { Spinners } from "@constants/spinner";

export type SpinnerType = keyof typeof Spinners;

export type SpinnerState = {
  frames: readonly string[];
  frameIndex: number;
  interval: NodeJS.Timeout | null;
  text: string;
  color: string;
  intervalMs: number;
};

export type ScannerState = {
  width: number;
  position: number;
  direction: number;
  interval: NodeJS.Timeout | null;
  text: string;
  char: string;
};
