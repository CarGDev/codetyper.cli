import { FILE_REFERENCE_PATTERN } from "@constants/patterns";
import { addContextFile } from "@commands/components/chat/context/add-context-file";

export const processFileReferences = async (
  input: string,
  contextFiles: Map<string, string>,
): Promise<string> => {
  const pattern = new RegExp(FILE_REFERENCE_PATTERN.source, "g");
  let match;
  const filesToAdd: string[] = [];

  while ((match = pattern.exec(input)) !== null) {
    const filePath = match[1] || match[2] || match[3];
    filesToAdd.push(filePath);
  }

  for (const filePath of filesToAdd) {
    await addContextFile(filePath, contextFiles);
  }

  const textOnly = input.replace(pattern, "").trim();
  if (!textOnly && filesToAdd.length > 0) {
    return `Analyze the files I've added to the context.`;
  }

  return input;
};
