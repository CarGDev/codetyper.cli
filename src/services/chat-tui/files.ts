/**
 * Chat TUI file handling
 */

import { readFile, stat } from "fs/promises";
import { resolve, basename, extname } from "path";
import { existsSync } from "fs";
import fg from "fast-glob";

import {
  FILE_SIZE_LIMITS,
  GLOB_IGNORE_PATTERNS,
  CHAT_MESSAGES,
} from "@constants/chat-service";
import {
  BINARY_EXTENSIONS,
  type BinaryExtension,
} from "@constants/file-picker";
import { appStore } from "@tui-solid/context/app";
import type { ChatServiceState } from "@/types/chat-service";

const isBinaryFile = (filePath: string): boolean => {
  const ext = extname(filePath).toLowerCase();
  return BINARY_EXTENSIONS.includes(ext as BinaryExtension);
};

const isExecutableWithoutExtension = async (
  filePath: string,
): Promise<boolean> => {
  const ext = extname(filePath);
  if (ext) return false;

  try {
    const buffer = Buffer.alloc(4);
    const { open } = await import("fs/promises");
    const handle = await open(filePath, "r");
    await handle.read(buffer, 0, 4, 0);
    await handle.close();

    // Check for common binary signatures
    // ELF (Linux executables)
    if (
      buffer[0] === 0x7f &&
      buffer[1] === 0x45 &&
      buffer[2] === 0x4c &&
      buffer[3] === 0x46
    ) {
      return true;
    }
    // Mach-O (macOS executables)
    if (
      (buffer[0] === 0xfe &&
        buffer[1] === 0xed &&
        buffer[2] === 0xfa &&
        buffer[3] === 0xce) ||
      (buffer[0] === 0xfe &&
        buffer[1] === 0xed &&
        buffer[2] === 0xfa &&
        buffer[3] === 0xcf) ||
      (buffer[0] === 0xce &&
        buffer[1] === 0xfa &&
        buffer[2] === 0xed &&
        buffer[3] === 0xfe) ||
      (buffer[0] === 0xcf &&
        buffer[1] === 0xfa &&
        buffer[2] === 0xed &&
        buffer[3] === 0xfe)
    ) {
      return true;
    }
    // MZ (Windows executables)
    if (buffer[0] === 0x4d && buffer[1] === 0x5a) {
      return true;
    }
    return false;
  } catch {
    return false;
  }
};

export const loadFile = async (
  state: ChatServiceState,
  filePath: string,
): Promise<void> => {
  try {
    if (isBinaryFile(filePath)) {
      appStore.addLog({
        type: "error",
        content: CHAT_MESSAGES.FILE_IS_BINARY(basename(filePath)),
      });
      return;
    }

    const stats = await stat(filePath);
    if (stats.size > FILE_SIZE_LIMITS.MAX_CONTEXT_FILE_SIZE) {
      appStore.addLog({
        type: "error",
        content: CHAT_MESSAGES.FILE_TOO_LARGE(basename(filePath), stats.size),
      });
      return;
    }

    if (await isExecutableWithoutExtension(filePath)) {
      appStore.addLog({
        type: "error",
        content: CHAT_MESSAGES.FILE_IS_BINARY(basename(filePath)),
      });
      return;
    }

    const content = await readFile(filePath, "utf-8");
    state.contextFiles.set(filePath, content);
    appStore.addLog({
      type: "system",
      content: CHAT_MESSAGES.FILE_ADDED(basename(filePath)),
    });
  } catch (error) {
    appStore.addLog({
      type: "error",
      content: CHAT_MESSAGES.FILE_READ_FAILED(error),
    });
  }
};

export const addContextFile = async (
  state: ChatServiceState,
  pattern: string,
): Promise<void> => {
  try {
    const paths = await fg(pattern, {
      cwd: process.cwd(),
      absolute: true,
      ignore: [...GLOB_IGNORE_PATTERNS],
    });

    if (paths.length === 0) {
      const absolutePath = resolve(process.cwd(), pattern);
      if (existsSync(absolutePath)) {
        await loadFile(state, absolutePath);
      } else {
        appStore.addLog({
          type: "error",
          content: CHAT_MESSAGES.FILE_NOT_FOUND(pattern),
        });
      }
      return;
    }

    for (const filePath of paths) {
      await loadFile(state, filePath);
    }
  } catch (error) {
    appStore.addLog({
      type: "error",
      content: CHAT_MESSAGES.FILE_ADD_FAILED(error),
    });
  }
};

export const processFileReferences = async (
  state: ChatServiceState,
  input: string,
): Promise<string> => {
  const filePattern = /@(?:"([^"]+)"|'([^']+)'|(\S+))/g;
  let match;
  const filesToAdd: string[] = [];

  while ((match = filePattern.exec(input)) !== null) {
    const filePath = match[1] || match[2] || match[3];
    filesToAdd.push(filePath);
  }

  for (const filePath of filesToAdd) {
    await addContextFile(state, filePath);
  }

  const textOnly = input.replace(filePattern, "").trim();
  if (!textOnly && filesToAdd.length > 0) {
    return CHAT_MESSAGES.ANALYZE_FILES;
  }

  return input;
};

export const buildContextMessage = (
  state: ChatServiceState,
  message: string,
): string => {
  if (state.contextFiles.size === 0) {
    return message;
  }

  const contextParts: string[] = [];
  for (const [path, fileContent] of state.contextFiles) {
    const ext = extname(path).slice(1) || "txt";
    contextParts.push(
      `File: ${basename(path)}\n\`\`\`${ext}\n${fileContent}\n\`\`\``,
    );
  }

  state.contextFiles.clear();
  return contextParts.join("\n\n") + "\n\n" + message;
};
