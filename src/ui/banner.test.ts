import { getBannerLines } from "./banner/lines";
import { renderBanner, renderBannerWithSubtitle } from "./banner/render";
import { printBanner, printWelcome } from "./banner/print";
import { getInlineLogo } from "./banner/logo";
import {
  BANNER_STYLE_MAP,
  BANNER_LINES,
  GRADIENT_COLORS,
} from "@constants/banner";
import { Style } from "@ui/styles";

describe("Banner Utilities", () => {
  describe("getBannerLines", () => {
    it("should return default banner lines when no style is provided", () => {
      const lines = getBannerLines();
      expect(lines).toEqual(BANNER_LINES);
    });

    it("should return banner lines for a specific style", () => {
      const style = "blocks";
      const lines = getBannerLines(style);
      expect(lines).toEqual(BANNER_STYLE_MAP[style]);
    });

    it("should return default banner lines for an unknown style", () => {
      const lines = getBannerLines("unknown-style" as any);
      expect(lines).toEqual(BANNER_LINES);
    });
  });

  describe("renderBanner", () => {
    it("should render banner with default style", () => {
      const banner = renderBanner();
      const expectedLines = BANNER_LINES.map((line, index) => {
        const colorIndex = Math.min(index, GRADIENT_COLORS.length - 1);
        const color = GRADIENT_COLORS[colorIndex];
        return color + line + Style.RESET;
      }).join("\n");

      expect(banner).toBe(expectedLines);
    });

    it("should render banner with a specific style", () => {
      const style = "blocks";
      const banner = renderBanner(style);
      const expectedLines = BANNER_STYLE_MAP[style]
        .map((line, index) => {
          const colorIndex = Math.min(index, GRADIENT_COLORS.length - 1);
          const color = GRADIENT_COLORS[colorIndex];
          return color + line + Style.RESET;
        })
        .join("\n");

      expect(banner).toBe(expectedLines);
    });
  });

  describe("renderBannerWithSubtitle", () => {
    it("should render banner with subtitle", () => {
      const subtitle = "Welcome to CodeTyper!";
      const style = "default";
      const bannerWithSubtitle = renderBannerWithSubtitle(subtitle, style);
      const banner = renderBanner(style);
      const expectedSubtitle = Style.DIM + "  " + subtitle + Style.RESET;

      expect(bannerWithSubtitle).toBe(banner + "\n" + expectedSubtitle);
    });
  });

  describe("printBanner", () => {
    it("should print the banner to the console", () => {
      const consoleSpy = jest
        .spyOn(console, "log")
        .mockImplementation(() => {});
      const style = "default";

      printBanner(style);

      expect(consoleSpy).toHaveBeenCalledWith("\n" + renderBanner(style));
      consoleSpy.mockRestore();
    });
  });

  describe("printWelcome", () => {
    it("should print the welcome message to the console", () => {
      const consoleSpy = jest
        .spyOn(console, "log")
        .mockImplementation(() => {});
      const version = "1.0.0";
      const provider = "OpenAI";
      const model = "GPT-4";

      printWelcome(version, provider, model);

      expect(consoleSpy).toHaveBeenCalledWith("\n" + renderBanner("blocks"));
      expect(consoleSpy).toHaveBeenCalledWith("");
      expect(consoleSpy).toHaveBeenCalledWith(
        Style.DIM + "  AI Coding Assistant" + Style.RESET,
      );
      expect(consoleSpy).toHaveBeenCalledWith("");
      expect(consoleSpy).toHaveBeenCalledWith(
        Style.DIM + `  v${version} | ${provider} | ${model}` + Style.RESET,
      );
      expect(consoleSpy).toHaveBeenCalledWith("");

      consoleSpy.mockRestore();
    });
  });

  describe("getInlineLogo", () => {
    it("should return the inline logo with correct style", () => {
      const logo = getInlineLogo();
      const expectedLogo = Style.CYAN + Style.BOLD + "codetyper" + Style.RESET;
      expect(logo).toBe(expectedLogo);
    });
  });
});
