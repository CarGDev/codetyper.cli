export interface ToolCallParams {
  id: string;
  name: string;
  description: string;
  args?: Record<string, unknown>;
}
