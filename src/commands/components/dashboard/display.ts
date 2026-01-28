/**
 * Dashboard Display
 *
 * Renders and displays the main dashboard UI.
 */

import { DASHBOARD_LAYOUT } from "@constants/dashboard";
import { buildDashboardConfig } from "@commands/components/dashboard/build-config";
import { renderHeader } from "@commands/components/dashboard/render-header";
import { renderContent } from "@commands/components/dashboard/render-content";
import { renderFooter } from "@commands/components/dashboard/render-footer";

const getTerminalWidth = (): number => {
  return process.stdout.columns || DASHBOARD_LAYOUT.DEFAULT_WIDTH;
};

const renderDashboard = async (version: string): Promise<string> => {
  const config = await buildDashboardConfig(version);
  const width = getTerminalWidth();

  const header = renderHeader(config, width);
  const content = renderContent(config, width, DASHBOARD_LAYOUT.CONTENT_HEIGHT);
  const footer = renderFooter(width);

  return [header, content, footer].join("\n");
};

export const displayDashboard = async (version: string): Promise<void> => {
  console.clear();
  const dashboard = await renderDashboard(version);
  console.log(dashboard);
  process.exit(0);
};
