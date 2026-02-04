/**
 * Spinner factory - functional implementation
 */

import { Spinners, SPINNER_DEFAULTS } from "@constants/spinner";
import { Style, Theme } from "@constants/styles";
import type { SpinnerState } from "@/types/spinner";
import type { SpinnerOptions } from "@interfaces/SpinnerOptions";

export type SpinnerInstance = {
  start: (text?: string) => void;
  stop: () => void;
  update: (text: string) => void;
  succeed: (text?: string) => void;
  fail: (text?: string) => void;
  warn: (text?: string) => void;
  info: (text?: string) => void;
  isSpinning: () => boolean;
};

const createState = (options: SpinnerOptions): SpinnerState => ({
  frames: Spinners[options.type || SPINNER_DEFAULTS.type],
  frameIndex: 0,
  interval: null,
  text: options.text || SPINNER_DEFAULTS.text,
  color: options.color || Theme.primary,
  intervalMs: options.interval || SPINNER_DEFAULTS.interval,
});

const render = (state: SpinnerState): void => {
  const frame = state.frames[state.frameIndex];
  const output = `\r${state.color}${frame}${Style.RESET} ${state.text}`;
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

const stopInterval = (state: SpinnerState): void => {
  if (state.interval) {
    clearInterval(state.interval);
    state.interval = null;
  }
  clearLine();
  showCursor();
};

const printResult = (icon: string, color: string, text: string): void => {
  console.log(`\r${color}${icon}${Style.RESET} ${text}`);
};

/**
 * Create a spinner instance
 */
export const createSpinnerInstance = (
  options: SpinnerOptions = {},
): SpinnerInstance => {
  const state = createState(options);

  const start = (text?: string): void => {
    if (text) state.text = text;
    hideCursor();

    state.interval = setInterval(() => {
      render(state);
      state.frameIndex = (state.frameIndex + 1) % state.frames.length;
    }, state.intervalMs);

    render(state);
  };

  const stop = (): void => {
    stopInterval(state);
  };

  const update = (text: string): void => {
    state.text = text;
  };

  const succeed = (text?: string): void => {
    stop();
    printResult("✓", Theme.success, text || state.text);
  };

  const fail = (text?: string): void => {
    stop();
    printResult("✗", Theme.error, text || state.text);
  };

  const warn = (text?: string): void => {
    stop();
    printResult("!", Theme.warning, text || state.text);
  };

  const info = (text?: string): void => {
    stop();
    printResult("ℹ", Theme.info, text || state.text);
  };

  const isSpinning = (): boolean => state.interval !== null;

  return {
    start,
    stop,
    update,
    succeed,
    fail,
    warn,
    info,
    isSpinning,
  };
};

/**
 * Create and start a spinner
 */
export const createSpinner = (
  text: string,
  options?: Omit<SpinnerOptions, "text">,
): SpinnerInstance => {
  const spinner = createSpinnerInstance({ ...options, text });
  spinner.start();
  return spinner;
};

// Backward compatibility - class-like object
export const Spinner = {
  create: createSpinnerInstance,
};
