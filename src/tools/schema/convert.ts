/**
 * Tool to function conversion utilities
 */

import { cleanJsonSchema } from "@tools/schema/clean";
import type { ToolDefinition, FunctionDefinition } from "@/types/tools";

export const toolToFunction = (tool: ToolDefinition): FunctionDefinition => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const jsonSchema = (tool.parameters as any).toJSONSchema() as Record<
    string,
    unknown
  >;

  const cleanSchema = cleanJsonSchema(jsonSchema);

  return {
    name: tool.name,
    description: tool.description,
    parameters: cleanSchema as FunctionDefinition["parameters"],
  };
};
