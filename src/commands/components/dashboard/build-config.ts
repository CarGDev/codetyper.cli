/**
 * Dashboard Config Builder
 */

import os from "os";
import { getConfig } from "@services/core/config";
import { DASHBOARD_TITLE } from "@constants/dashboard";
import type { DashboardConfig } from "@/types/dashboard";

export const buildDashboardConfig = async (
  version: string,
): Promise<DashboardConfig> => {
  const configMgr = await getConfig();
  const username = os.userInfo().username;
  const cwd = process.cwd();
  const provider = configMgr.get("provider") as string;

  return {
    title: DASHBOARD_TITLE,
    version,
    user: username,
    cwd,
    provider,
  };
};
