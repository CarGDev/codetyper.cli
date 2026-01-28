/**
 * Copilot usage API types
 */

export interface CopilotQuotaDetail {
  entitlement: number;
  overage_count: number;
  overage_permitted: boolean;
  percent_remaining: number;
  quota_id: string;
  quota_remaining: number;
  remaining: number;
  unlimited: boolean;
}

export interface CopilotQuotaSnapshots {
  chat?: CopilotQuotaDetail;
  completions?: CopilotQuotaDetail;
  premium_interactions: CopilotQuotaDetail;
}

export interface CopilotUsageResponse {
  access_type_sku: string;
  analytics_tracking_id: string;
  assigned_date: string;
  can_signup_for_limited: boolean;
  chat_enabled: boolean;
  copilot_plan: string;
  organization_login_list: unknown[];
  organization_list: unknown[];
  quota_reset_date: string;
  quota_snapshots: CopilotQuotaSnapshots;
}
