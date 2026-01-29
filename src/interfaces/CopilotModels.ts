/**
 * Copilot Models API Interfaces
 */

export interface ModelBilling {
  is_premium: boolean;
  multiplier: number;
  restricted_to?: string[];
}

export interface ModelCapabilities {
  type?: string;
  limits?: {
    max_output_tokens?: number;
  };
  supports?: {
    tool_calls?: boolean;
    streaming?: boolean;
  };
}

export interface ModelsApiModel {
  id: string;
  name?: string;
  model_picker_enabled?: boolean;
  billing?: ModelBilling;
  capabilities?: ModelCapabilities;
}

export interface ModelsApiResponse {
  data: ModelsApiModel[];
}
