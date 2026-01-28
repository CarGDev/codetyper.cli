import { readFile, stat } from "fs/promises";
import { basename } from "path";
import { warningMessage, successMessage, errorMessage } from "@utils/terminal";
import { addContextFile } from "@services/session";

export const loadFile = async (
  filePath: string,
  contextFiles: Map<string, string>,
): Promise<void> => {
  try {
    const stats = await stat(filePath);
    if (stats.isDirectory()) {
      warningMessage(`Skipping directory: ${filePath}`);
      return;
    }

    if (stats.size > 100 * 1024) {
      warningMessage(`File too large (>100KB): ${basename(filePath)}`);
      return;
    }

    const content = await readFile(filePath, "utf-8");
    contextFiles.set(filePath, content);
    successMessage(
      `Added: ${basename(filePath)} (${content.split("\n").length} lines)`,
    );

    await addContextFile(filePath);
  } catch (error) {
    errorMessage(`Failed to read file: ${error}`);
  }
};
