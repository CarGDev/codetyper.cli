/**
 * Scanner spinner - Knight Rider style animation
 */

import { SCANNER_DEFAULTS } from "@constants/spinner";
import { Style, Theme } from "@constants/styles";
import type { ScannerState } from "@/types/spinner";
import type { ScannerOptions } from "@interfaces/SpinnerOptions";

export type ScannerInstance = {
  start: (text?: string) => void;
  stop: () => void;
};

const createState = (options: ScannerOptions = {}): ScannerState => ({
  width: options.width || SCANNER_DEFAULTS.width,
  position: 0,
  direction: 1,
  interval: null,
  text: options.text || "",
  char: options.char || SCANNER_DEFAULTS.char,
});

const render = (state: ScannerState): void => {
  const bar = Array(state.width).fill("░");

  // Create trail effect
  for (let i = -2; i <= 2; i++) {
    const pos = state.position + i;
    if (pos >= 0 && pos < state.width) {
      const charMap: Record<number, string> = {
        0: state.char,
        1: "▓",
        "-1": "▓",
        2: "▒",
        "-2": "▒",
      };
      bar[pos] = charMap[i] || bar[pos];
    }
  }

  const output = `\r${Theme.primary}[${bar.join("")}]${Style.RESET} ${state.text}`;
  process.stdout.write(output);
};

const hideCursor = (): void => {
  process.stdout.write("\x1b[?25l");
};

const showCursor = (): void => {
  process.stdout.write("\x1b[?25h");
};

const clearLine = (): void => {
  process.stdout.write("\r\x1b[K");
};

/**
 * Create a scanner spinner instance
 */
export const createScannerInstance = (
  options: ScannerOptions = {},
): ScannerInstance => {
  const state = createState(options);

  const start = (text?: string): void => {
    if (text) state.text = text;
    hideCursor();

    state.interval = setInterval(() => {
      render(state);
      state.position += state.direction;
      if (state.position >= state.width - 1 || state.position <= 0) {
        state.direction *= -1;
      }
    }, SCANNER_DEFAULTS.interval);

    render(state);
  };

  const stop = (): void => {
    if (state.interval) {
      clearInterval(state.interval);
      state.interval = null;
    }
    clearLine();
    showCursor();
  };

  return { start, stop };
};

// Backward compatibility
export const ScannerSpinner = {
  create: createScannerInstance,
};
