/**
 * LSP Tool - Provides code intelligence capabilities to the agent
 *
 * Operations:
 * - hover: Get hover information at a position
 * - definition: Jump to definition
 * - references: Find all references
 * - symbols: Get document symbols
 * - diagnostics: Get file diagnostics
 */

import { z } from "zod";
import {
  lspService,
  type Diagnostic,
  type Location,
  type DocumentSymbol,
  type Hover,
} from "@services/lsp/index";
import type { ToolDefinition } from "@tools/core/types";
import fs from "fs/promises";

const PositionSchema = z.object({
  line: z.number().describe("Zero-based line number"),
  character: z.number().describe("Zero-based character offset"),
});

const parametersSchema = z.object({
  operation: z
    .enum(["hover", "definition", "references", "symbols", "diagnostics"])
    .describe("The LSP operation to perform"),
  file: z.string().describe("Path to the file"),
  position: PositionSchema.optional().describe(
    "Position in the file (required for hover, definition, references)",
  ),
});

type LSPParams = z.infer<typeof parametersSchema>;

const formatDiagnostics = (diagnostics: Diagnostic[]): string => {
  if (diagnostics.length === 0) {
    return "No diagnostics found.";
  }

  const severityNames = ["", "Error", "Warning", "Info", "Hint"];

  return diagnostics
    .map((d) => {
      const severity = severityNames[d.severity ?? 1];
      const location = `${d.range.start.line + 1}:${d.range.start.character + 1}`;
      const source = d.source ? `[${d.source}] ` : "";
      return `${severity} at ${location}: ${source}${d.message}`;
    })
    .join("\n");
};

const formatLocation = (loc: Location): string => {
  const file = loc.uri.replace("file://", "");
  const line = loc.range.start.line + 1;
  const char = loc.range.start.character + 1;
  return `${file}:${line}:${char}`;
};

const formatLocations = (locations: Location | Location[] | null): string => {
  if (!locations) {
    return "No locations found.";
  }

  const locs = Array.isArray(locations) ? locations : [locations];
  if (locs.length === 0) {
    return "No locations found.";
  }

  return locs.map(formatLocation).join("\n");
};

const formatSymbols = (symbols: DocumentSymbol[], indent = 0): string => {
  const kindNames: Record<number, string> = {
    1: "File",
    2: "Module",
    3: "Namespace",
    4: "Package",
    5: "Class",
    6: "Method",
    7: "Property",
    8: "Field",
    9: "Constructor",
    10: "Enum",
    11: "Interface",
    12: "Function",
    13: "Variable",
    14: "Constant",
    15: "String",
    16: "Number",
    17: "Boolean",
    18: "Array",
    19: "Object",
    20: "Key",
    21: "Null",
    22: "EnumMember",
    23: "Struct",
    24: "Event",
    25: "Operator",
    26: "TypeParameter",
  };

  const lines: string[] = [];
  const prefix = "  ".repeat(indent);

  for (const symbol of symbols) {
    const kind = kindNames[symbol.kind] ?? "Unknown";
    const line = symbol.range.start.line + 1;
    lines.push(`${prefix}${kind}: ${symbol.name} (line ${line})`);

    if (symbol.children && symbol.children.length > 0) {
      lines.push(formatSymbols(symbol.children, indent + 1));
    }
  }

  return lines.join("\n");
};

const formatHover = (hover: Hover | null): string => {
  if (!hover) {
    return "No hover information available.";
  }

  const contents = hover.contents;

  if (typeof contents === "string") {
    return contents;
  }

  if (Array.isArray(contents)) {
    return contents
      .map((c) => (typeof c === "string" ? c : c.value))
      .join("\n\n");
  }

  return contents.value;
};

export const lspTool: ToolDefinition = {
  name: "lsp",
  description: `Get code intelligence information using Language Server Protocol.

Operations:
- hover: Get type information and documentation at a position
- definition: Find where a symbol is defined
- references: Find all references to a symbol
- symbols: Get all symbols in a document (classes, functions, etc.)
- diagnostics: Get errors and warnings for a file

Examples:
- Get hover info: { "operation": "hover", "file": "src/app.ts", "position": { "line": 10, "character": 5 } }
- Find definition: { "operation": "definition", "file": "src/app.ts", "position": { "line": 10, "character": 5 } }
- Get symbols: { "operation": "symbols", "file": "src/app.ts" }
- Get diagnostics: { "operation": "diagnostics", "file": "src/app.ts" }`,
  parameters: parametersSchema,
  execute: async (args: LSPParams) => {
    const { operation, file, position } = args;

    // Check if file exists
    try {
      await fs.access(file);
    } catch {
      return {
        success: false,
        title: "File not found",
        output: `File not found: ${file}`,
      };
    }

    // Check if LSP support is available
    if (!lspService.hasSupport(file)) {
      return {
        success: false,
        title: "No LSP support",
        output: `No language server available for this file type.`,
      };
    }

    // Open file in LSP
    await lspService.openFile(file);

    const operationHandlers: Record<string, () => Promise<{ title: string; output: string }>> = {
      hover: async () => {
        if (!position) {
          return { title: "Error", output: "Position required for hover operation" };
        }
        const hover = await lspService.getHover(file, position);
        return { title: "Hover Info", output: formatHover(hover) };
      },

      definition: async () => {
        if (!position) {
          return { title: "Error", output: "Position required for definition operation" };
        }
        const definition = await lspService.getDefinition(file, position);
        return { title: "Definition", output: formatLocations(definition) };
      },

      references: async () => {
        if (!position) {
          return { title: "Error", output: "Position required for references operation" };
        }
        const references = await lspService.getReferences(file, position);
        return {
          title: `References (${references.length})`,
          output: formatLocations(references.length > 0 ? references : null),
        };
      },

      symbols: async () => {
        const symbols = await lspService.getDocumentSymbols(file);
        if (symbols.length === 0) {
          return { title: "Document Symbols", output: "No symbols found." };
        }
        return {
          title: `Document Symbols (${symbols.length})`,
          output: formatSymbols(symbols),
        };
      },

      diagnostics: async () => {
        const diagnosticsMap = lspService.getDiagnostics(file);
        const allDiagnostics: Diagnostic[] = [];
        for (const diags of diagnosticsMap.values()) {
          allDiagnostics.push(...diags);
        }
        return {
          title: `Diagnostics (${allDiagnostics.length})`,
          output: formatDiagnostics(allDiagnostics),
        };
      },
    };

    const handler = operationHandlers[operation];
    if (!handler) {
      return {
        success: false,
        title: "Unknown operation",
        output: `Unknown LSP operation: ${operation}`,
      };
    }

    const result = await handler();
    return {
      success: true,
      ...result,
    };
  },
};
