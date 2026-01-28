/**
 * Banner lines utilities
 */

import { BANNER_STYLE_MAP, BANNER_LINES } from "@constants/banner";
import type { BannerStyle } from "@/types/banner";

/**
 * Get the banner lines for a given style
 */
export const getBannerLines = (
  style: BannerStyle = "default",
): readonly string[] => BANNER_STYLE_MAP[style] ?? BANNER_LINES;
