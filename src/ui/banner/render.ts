/**
 * Banner rendering utilities
 */

import { GRADIENT_COLORS } from "@constants/banner";
import { Style } from "@ui/styles";
import type { BannerStyle } from "@/types/banner";
import { getBannerLines } from "@ui/banner/lines";

/**
 * Render the banner with gradient colors
 */
export const renderBanner = (style: BannerStyle = "default"): string => {
  const lines = getBannerLines(style);

  return lines
    .map((line, index) => {
      const colorIndex = Math.min(index, GRADIENT_COLORS.length - 1);
      const color = GRADIENT_COLORS[colorIndex];
      return color + line + Style.RESET;
    })
    .join("\n");
};

/**
 * Render banner with subtitle
 */
export const renderBannerWithSubtitle = (
  subtitle: string,
  style: BannerStyle = "default",
): string => {
  const banner = renderBanner(style);
  const subtitleLine = Style.DIM + "  " + subtitle + Style.RESET;
  return banner + "\n" + subtitleLine;
};
