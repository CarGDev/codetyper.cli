/**
 * Text clipboard service - Cross-platform text copy/read
 *
 * Supports macOS, Linux (Wayland + X11), Windows, and
 * OSC 52 for SSH/tmux environments.
 */

import type { CopyMethod } from "@/types/clipboard";
import {
  OSC52_SEQUENCE_PREFIX,
  OSC52_SEQUENCE_SUFFIX,
  TMUX_DCS_PREFIX,
  TMUX_DCS_SUFFIX,
  TMUX_ENV_VAR,
  SCREEN_ENV_VAR,
  WAYLAND_DISPLAY_ENV_VAR,
} from "@constants/clipboard";
import {
  runCommandText,
  runCommandWithStdin,
  commandExists,
} from "@services/clipboard/run-command";

/**
 * Write text to clipboard via OSC 52 escape sequence.
 * Works over SSH by having the terminal emulator handle
 * the clipboard locally. Requires TTY.
 */
export const writeOsc52 = (text: string): void => {
  if (!process.stdout.isTTY) {
    return;
  }

  const base64 = Buffer.from(text).toString("base64");
  const osc52 = `${OSC52_SEQUENCE_PREFIX}${base64}${OSC52_SEQUENCE_SUFFIX}`;

  const isPassthrough =
    Boolean(process.env[TMUX_ENV_VAR]) ||
    Boolean(process.env[SCREEN_ENV_VAR]);

  const sequence = isPassthrough
    ? `${TMUX_DCS_PREFIX}${osc52}${TMUX_DCS_SUFFIX}`
    : osc52;

  process.stdout.write(sequence);
};

/** Platform-specific copy method builders (object map dispatch) */
const copyMethodBuilders: Record<string, () => CopyMethod | null> = {
  darwin: () => {
    if (!commandExists("osascript")) {
      return null;
    }
    return async (text: string): Promise<void> => {
      const escaped = text.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
      await runCommandText("osascript", [
        "-e",
        `set the clipboard to "${escaped}"`,
      ]);
    };
  },

  linux: () => {
    if (process.env[WAYLAND_DISPLAY_ENV_VAR] && commandExists("wl-copy")) {
      return async (text: string): Promise<void> => {
        await runCommandWithStdin("wl-copy", [], text);
      };
    }
    if (commandExists("xclip")) {
      return async (text: string): Promise<void> => {
        await runCommandWithStdin(
          "xclip",
          ["-selection", "clipboard"],
          text,
        );
      };
    }
    if (commandExists("xsel")) {
      return async (text: string): Promise<void> => {
        await runCommandWithStdin(
          "xsel",
          ["--clipboard", "--input"],
          text,
        );
      };
    }
    return null;
  },

  win32: () => {
    return async (text: string): Promise<void> => {
      await runCommandWithStdin(
        "powershell.exe",
        [
          "-NonInteractive",
          "-NoProfile",
          "-Command",
          "[Console]::InputEncoding = [System.Text.Encoding]::UTF8; Set-Clipboard -Value ([Console]::In.ReadToEnd())",
        ],
        text,
      );
    };
  },
};

/** Lazily resolved platform copy method (cached after first call) */
let cachedCopyMethod: CopyMethod | null = null;
let copyMethodResolved = false;

const resolveCopyMethod = (): CopyMethod | null => {
  if (copyMethodResolved) {
    return cachedCopyMethod;
  }

  const platform = process.platform;
  const builder = copyMethodBuilders[platform];
  cachedCopyMethod = builder ? builder() : null;
  copyMethodResolved = true;

  return cachedCopyMethod;
};

/**
 * Copy text to system clipboard.
 * Always writes OSC 52 for SSH/remote support,
 * then uses platform-native copy if available.
 */
export const copyToClipboard = async (text: string): Promise<void> => {
  writeOsc52(text);

  const method = resolveCopyMethod();
  if (method) {
    await method(text);
  }
};

/** Platform-specific text read commands (object map dispatch) */
const textReadCommands: Record<string, () => Promise<string | null>> = {
  darwin: async (): Promise<string | null> => {
    if (!commandExists("pbpaste")) {
      return null;
    }
    const text = await runCommandText("pbpaste", []);
    return text || null;
  },

  linux: async (): Promise<string | null> => {
    if (process.env[WAYLAND_DISPLAY_ENV_VAR] && commandExists("wl-paste")) {
      const text = await runCommandText("wl-paste", ["--no-newline"]);
      return text || null;
    }
    if (commandExists("xclip")) {
      const text = await runCommandText("xclip", [
        "-selection",
        "clipboard",
        "-o",
      ]);
      return text || null;
    }
    if (commandExists("xsel")) {
      const text = await runCommandText("xsel", [
        "--clipboard",
        "--output",
      ]);
      return text || null;
    }
    return null;
  },

  win32: async (): Promise<string | null> => {
    const text = await runCommandText("powershell.exe", [
      "-NonInteractive",
      "-NoProfile",
      "-Command",
      "Get-Clipboard",
    ]);
    return text || null;
  },
};

/**
 * Read text from system clipboard.
 * Returns null if clipboard is empty or no native tool is available.
 */
export const readClipboardText = async (): Promise<string | null> => {
  const platform = process.platform;
  const reader = textReadCommands[platform];

  if (!reader) {
    return null;
  }

  try {
    return await reader();
  } catch {
    return null;
  }
};
