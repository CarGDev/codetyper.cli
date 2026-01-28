/**
 * Provider credentials management
 */

import { readFile, writeFile, mkdir } from "fs/promises";
import { existsSync } from "fs";

import { DIRS, FILES } from "@constants/paths";
import { CREDENTIALS_FILE_MODE } from "@constants/providers";
import type { StoredCredentials } from "@/types/providers";

export const loadCredentials = async (): Promise<StoredCredentials> => {
  if (!existsSync(FILES.credentials)) {
    return {};
  }

  try {
    const content = await readFile(FILES.credentials, "utf-8");
    return JSON.parse(content);
  } catch {
    return {};
  }
};

export const saveCredentials = async (
  credentials: StoredCredentials,
): Promise<void> => {
  await mkdir(DIRS.data, { recursive: true });
  await writeFile(FILES.credentials, JSON.stringify(credentials, null, 2), {
    mode: CREDENTIALS_FILE_MODE,
  });
};
