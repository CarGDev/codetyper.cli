/**
 * Ensures all XDG-compliant directories exist
 */

import { mkdir } from "fs/promises";
import { DIRS } from "@constants/paths";

export const ensureXdgDirectories = async (): Promise<void> => {
  await mkdir(DIRS.config, { recursive: true });
  await mkdir(DIRS.data, { recursive: true });
  await mkdir(DIRS.cache, { recursive: true });
  await mkdir(DIRS.state, { recursive: true });
  await mkdir(DIRS.sessions, { recursive: true });
};
