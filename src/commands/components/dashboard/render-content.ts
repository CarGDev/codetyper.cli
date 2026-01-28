/**
 * Dashboard Content Renderer
 */

import { DASHBOARD_LAYOUT, DASHBOARD_BORDER } from "@constants/dashboard";
import { renderLeftContent } from "@commands/components/dashboard/render-left-content";
import { renderRightContent } from "@commands/components/dashboard/render-right-content";
import type { DashboardConfig } from "@/types/dashboard";

const padContent = (content: string[], height: number): string[] => {
  const padded = [...content];
  while (padded.length < height) {
    padded.push("");
  }
  return padded;
};

export const renderContent = (
  config: DashboardConfig,
  width: number,
  height: number,
): string => {
  const dividerPos = Math.floor(width * DASHBOARD_LAYOUT.LEFT_COLUMN_RATIO);
  const leftWidth = dividerPos - DASHBOARD_LAYOUT.PADDING;
  const rightWidth = width - dividerPos - DASHBOARD_LAYOUT.PADDING;

  const leftContent = padContent(renderLeftContent(config), height);
  const rightContent = padContent(renderRightContent(), height);

  const lines: string[] = [];

  for (let i = 0; i < height; i++) {
    const left = (leftContent[i] || "").padEnd(leftWidth);
    const right = (rightContent[i] || "").padEnd(rightWidth);
    lines.push(
      `${DASHBOARD_BORDER.VERTICAL} ${left} ${DASHBOARD_BORDER.VERTICAL} ${right} ${DASHBOARD_BORDER.VERTICAL}`,
    );
  }

  return lines.join("\n");
};
