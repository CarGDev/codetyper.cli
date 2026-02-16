/**
 * Quota Color System
 *
 * Defines color thresholds and status helpers for Copilot usage display
 *
 * Thresholds:
 * - Green (healthy): 0-60% usage
 * - Yellow (warning): 60-95% usage
 * - Red (critical): 95-100% usage
 */

export type QuotaStatus = "healthy" | "warning" | "critical";

export interface QuotaStatusInfo {
  status: QuotaStatus;
  color: "success" | "warning" | "error";
}

/**
 * Get quota status based on percentage remaining
 * @param percentRemaining - Percentage of quota remaining (0-100)
 * @returns Status info with status level and color
 */
export function getQuotaStatus(percentRemaining: number): QuotaStatusInfo {
  // Handle unlimited quotas (shown as 100%)
  if (percentRemaining >= 100) {
    return { status: "healthy", color: "success" };
  }

  // Critical: 5% or less remaining (95%+ used)
  if (percentRemaining <= 5) {
    return { status: "critical", color: "error" };
  }

  // Warning: 40% or less remaining (60%+ used)
  if (percentRemaining <= 40) {
    return { status: "warning", color: "warning" };
  }

  // Healthy: more than 40% remaining (less than 60% used)
  return { status: "healthy", color: "success" };
}

/**
 * Calculate percentage remaining from quota detail
 * @param remaining - Number of requests remaining
 * @param entitlement - Total entitlement
 * @param unlimited - Whether quota is unlimited
 * @returns Percentage remaining (0-100), or 100 for unlimited
 */
export function calculatePercentRemaining(
  remaining: number,
  entitlement: number,
  unlimited: boolean,
): number {
  if (unlimited) {
    return 100;
  }

  if (entitlement === 0) {
    return 0;
  }

  return Math.max(0, Math.min(100, (remaining / entitlement) * 100));
}
