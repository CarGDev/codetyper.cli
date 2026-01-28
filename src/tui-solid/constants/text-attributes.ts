// Re-export TextAttributes from @opentui/core for convenient access
export { TextAttributes } from "@opentui/core";

// Helper to combine multiple attributes
export function combineAttributes(...attrs: number[]): number {
  return attrs.reduce((acc, attr) => acc | attr, 0);
}
