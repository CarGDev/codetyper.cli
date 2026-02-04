/**
 * Banner printing utilities
 */

import { Style } from "@ui/core/styles";
import type { BannerStyle } from "@/types/banner";
import { renderBanner } from "@ui/banner/core/render";

/**
 * Print the banner to console
 */
export const printBanner = (style: BannerStyle = "default"): void => {
  console.log("\n" + renderBanner(style));
};

/**
 * Print banner with version and info
 */
export const printWelcome = (
  version: string,
  provider?: string,
  model?: string,
): void => {
  console.log("\n" + renderBanner("blocks"));
  console.log("");
  console.log(Style.DIM + "  AI Coding Assistant" + Style.RESET);
  console.log("");

  const info: string[] = [];
  if (version) info.push(`v${version}`);
  if (provider) info.push(provider);
  if (model) info.push(model);

  if (info.length > 0) {
    console.log(Style.DIM + "  " + info.join(" | ") + Style.RESET);
  }

  console.log("");
};
