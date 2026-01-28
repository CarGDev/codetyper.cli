/**
 * Dashboard Header Renderer
 */

import chalk from "chalk";
import { DASHBOARD_BORDER } from "@constants/dashboard";
import type { DashboardConfig } from "@/types/dashboard";

export const renderHeader = (
  config: DashboardConfig,
  width: number,
): string => {
  const title = ` ${config.title} ${config.version} `;
  const dashCount = Math.max(0, width - title.length - 2);
  const dashes = DASHBOARD_BORDER.HORIZONTAL.repeat(dashCount);

  return `${DASHBOARD_BORDER.TOP_LEFT}${DASHBOARD_BORDER.HORIZONTAL}${DASHBOARD_BORDER.HORIZONTAL}${DASHBOARD_BORDER.HORIZONTAL} ${chalk.cyan.bold(title)}${dashes}${DASHBOARD_BORDER.TOP_RIGHT}`;
};
