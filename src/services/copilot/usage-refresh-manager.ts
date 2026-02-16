/**
 * Copilot Usage Refresh Manager
 *
 * Manages automatic refresh of Copilot usage data with:
 * - 60-second interval timer
 * - 5-second cache to prevent duplicate fetches
 * - 2-second debouncing for manual refresh triggers
 * - Lifecycle management (start/stop)
 */

import type { AppContextValue } from "@/tui-solid/context/app";

const REFRESH_INTERVAL_MS = 60000; // 60 seconds
const DEBOUNCE_MS = 2000; // 2 seconds

export class UsageRefreshManager {
  private static instance: UsageRefreshManager | null = null;

  private intervalId: NodeJS.Timeout | null = null;
  private lastManualRefreshTime = 0;
  private appStore: AppContextValue | null = null;

  private constructor() {}

  public static getInstance(): UsageRefreshManager {
    if (!UsageRefreshManager.instance) {
      UsageRefreshManager.instance = new UsageRefreshManager();
    }
    return UsageRefreshManager.instance;
  }

  /**
   * Start automatic refresh with 60-second intervals
   */
  public start(appStore: AppContextValue): void {
    this.appStore = appStore;

    // Clear any existing interval
    this.stop();

    // Only start if provider is copilot
    if (appStore.provider() !== "copilot") {
      return;
    }

    // Set up 60-second interval
    this.intervalId = setInterval(() => {
      if (this.appStore && this.appStore.provider() === "copilot") {
        this.appStore.fetchCopilotUsage();
      } else {
        // Provider changed, stop refreshing
        this.stop();
      }
    }, REFRESH_INTERVAL_MS);
  }

  /**
   * Stop automatic refresh
   */
  public stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  /**
   * Manually trigger a refresh (debounced to prevent spam)
   */
  public manualRefresh(): void {
    const now = Date.now();

    // Debounce: only allow manual refresh if 2 seconds have passed
    if (now - this.lastManualRefreshTime < DEBOUNCE_MS) {
      return;
    }

    this.lastManualRefreshTime = now;

    if (this.appStore) {
      this.appStore.fetchCopilotUsage();
    }
  }

  /**
   * Check if manager is currently running
   */
  public isRunning(): boolean {
    return this.intervalId !== null;
  }

  /**
   * Get the app store reference
   */
  public getAppStore(): AppContextValue | null {
    return this.appStore;
  }
}

// Export singleton instance getter
export const getUsageRefreshManager = (): UsageRefreshManager => {
  return UsageRefreshManager.getInstance();
};
