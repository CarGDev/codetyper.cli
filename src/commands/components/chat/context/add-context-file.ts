import { resolve } from "path";
import { existsSync } from "fs";
import fg from "fast-glob";
import { errorMessage, warningMessage } from "@utils/terminal";
import { loadFile } from "@commands/components/chat/context/load-file";
import { IGNORE_FOLDERS } from "@constants/paths";

export const addContextFile = async (
  pattern: string,
  contextFiles: Map<string, string>,
): Promise<void> => {
  try {
    const paths = await fg(pattern, {
      cwd: process.cwd(),
      absolute: true,
      ignore: IGNORE_FOLDERS,
    });

    if (paths.length === 0) {
      const absolutePath = resolve(process.cwd(), pattern);
      if (existsSync(absolutePath)) {
        await loadFile(absolutePath, contextFiles);
      } else {
        warningMessage(`File not found: ${pattern}`);
      }
      return;
    }

    for (const filePath of paths) {
      await loadFile(filePath, contextFiles);
    }
  } catch (error) {
    errorMessage(`Failed to add file: ${error}`);
  }
};
