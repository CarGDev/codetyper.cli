import { basename } from "path";
import { warningMessage, successMessage } from "@utils/core/terminal";

export const removeFile = (
  filename: string,
  contextFiles: Map<string, string>,
): void => {
  if (!filename) {
    warningMessage("Please specify a file to remove");
    return;
  }

  for (const [path] of contextFiles) {
    if (path.includes(filename) || basename(path) === filename) {
      contextFiles.delete(path);
      successMessage(`Removed: ${basename(path)}`);
      return;
    }
  }

  warningMessage(`File not found in context: ${filename}`);
};
