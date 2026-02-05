/**
 * Brain MCP Server service
 * Exposes Brain as an MCP server for external tools
 */

import {
  createServer,
  type Server,
  type IncomingMessage,
  type ServerResponse,
} from "node:http";

import type {
  BrainMcpServerConfig,
  BrainMcpRequest,
  BrainMcpResponse,
  BrainMcpServerStatus,
  BrainMcpToolName,
  McpContent,
  McpError,
  BrainMcpTool,
} from "@/types/brain-mcp";
import {
  DEFAULT_BRAIN_MCP_SERVER_CONFIG,
  BRAIN_MCP_TOOLS,
  MCP_ERROR_CODES,
} from "@/types/brain-mcp";
import { BRAIN_MCP_MESSAGES, BRAIN_MCP_ERRORS } from "@constants/brain-mcp";

type BrainService = {
  recall: (query: string, limit?: number) => Promise<unknown>;
  learn: (
    name: string,
    whatItDoes: string,
    options?: unknown,
  ) => Promise<unknown>;
  searchMemories: (
    query: string,
    limit?: number,
    type?: string,
  ) => Promise<unknown>;
  relate: (
    source: string,
    target: string,
    type: string,
    weight?: number,
  ) => Promise<unknown>;
  getContext: (query: string, maxConcepts?: number) => Promise<string>;
  getStats: () => Promise<unknown>;
  isConnected: () => boolean;
};

interface McpServerState {
  server: Server | null;
  config: BrainMcpServerConfig;
  brainService: BrainService | null;
  connectedClients: number;
  startTime: number | null;
  requestsServed: number;
  lastRequestAt: number | null;
  rateLimitMap: Map<string, { count: number; resetAt: number }>;
  apiKeys: Set<string>;
}

const state: McpServerState = {
  server: null,
  config: DEFAULT_BRAIN_MCP_SERVER_CONFIG,
  brainService: null,
  connectedClients: 0,
  startTime: null,
  requestsServed: 0,
  lastRequestAt: null,
  rateLimitMap: new Map(),
  apiKeys: new Set(),
};

const createMcpError = (
  code: number,
  message: string,
  data?: unknown,
): McpError => ({
  code,
  message,
  data,
});

const createMcpResponse = (
  id: string | number,
  content?: ReadonlyArray<McpContent>,
  error?: McpError,
): BrainMcpResponse => {
  if (error) {
    return { id, error };
  }

  return {
    id,
    result: {
      content: content || [],
    },
  };
};

const checkRateLimit = (clientIp: string): boolean => {
  if (!state.config.rateLimit.enabled) return true;

  const now = Date.now();
  const clientLimit = state.rateLimitMap.get(clientIp);

  if (!clientLimit || now > clientLimit.resetAt) {
    state.rateLimitMap.set(clientIp, {
      count: 1,
      resetAt: now + state.config.rateLimit.windowMs,
    });
    return true;
  }

  if (clientLimit.count >= state.config.rateLimit.maxRequests) {
    return false;
  }

  state.rateLimitMap.set(clientIp, {
    ...clientLimit,
    count: clientLimit.count + 1,
  });

  return true;
};

const validateApiKey = (req: IncomingMessage): boolean => {
  if (!state.config.enableAuth) return true;

  const apiKey = req.headers[state.config.apiKeyHeader.toLowerCase()] as
    | string
    | undefined;

  if (!apiKey) return false;

  // If no API keys configured, accept any key for now
  if (state.apiKeys.size === 0) return true;

  return state.apiKeys.has(apiKey);
};

const handleToolCall = async (
  toolName: BrainMcpToolName,
  args: Record<string, unknown>,
): Promise<McpContent[]> => {
  if (!state.brainService) {
    throw createMcpError(
      MCP_ERROR_CODES.BRAIN_UNAVAILABLE,
      BRAIN_MCP_MESSAGES.SERVER_NOT_RUNNING,
    );
  }

  if (!state.brainService.isConnected()) {
    throw createMcpError(
      MCP_ERROR_CODES.BRAIN_UNAVAILABLE,
      "Brain service not connected",
    );
  }

  const tool = BRAIN_MCP_TOOLS.find((t: BrainMcpTool) => t.name === toolName);
  if (!tool) {
    throw createMcpError(
      MCP_ERROR_CODES.TOOL_NOT_FOUND,
      `Tool not found: ${toolName}`,
    );
  }

  let result: unknown;

  const toolHandlers: Record<BrainMcpToolName, () => Promise<unknown>> = {
    brain_recall: () =>
      state.brainService!.recall(
        args.query as string,
        args.limit as number | undefined,
      ),
    brain_learn: () =>
      state.brainService!.learn(
        args.name as string,
        args.whatItDoes as string,
        { keywords: args.keywords, patterns: args.patterns, files: args.files },
      ),
    brain_search: () =>
      state.brainService!.searchMemories(
        args.query as string,
        args.limit as number | undefined,
        args.type as string | undefined,
      ),
    brain_relate: () =>
      state.brainService!.relate(
        args.sourceConcept as string,
        args.targetConcept as string,
        args.relationType as string,
        args.weight as number | undefined,
      ),
    brain_context: () =>
      state.brainService!.getContext(
        args.query as string,
        args.maxConcepts as number | undefined,
      ),
    brain_stats: () => state.brainService!.getStats(),
    brain_projects: async () => {
      // Import dynamically to avoid circular dependency
      const { listProjects } = await import("@services/brain/project-service");
      return listProjects();
    },
  };

  const handler = toolHandlers[toolName];
  if (!handler) {
    throw createMcpError(
      MCP_ERROR_CODES.TOOL_NOT_FOUND,
      `No handler for tool: ${toolName}`,
    );
  }

  result = await handler();

  return [
    {
      type: "text",
      text:
        typeof result === "string" ? result : JSON.stringify(result, null, 2),
    },
  ];
};

const handleRequest = async (
  req: IncomingMessage,
  res: ServerResponse,
): Promise<void> => {
  // Set CORS headers
  res.setHeader(
    "Access-Control-Allow-Origin",
    state.config.allowedOrigins.join(","),
  );
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader(
    "Access-Control-Allow-Headers",
    `Content-Type, ${state.config.apiKeyHeader}`,
  );

  // Handle preflight
  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  if (req.method !== "POST") {
    res.writeHead(405);
    res.end(
      JSON.stringify(
        createMcpResponse("", undefined, BRAIN_MCP_ERRORS.INVALID_REQUEST),
      ),
    );
    return;
  }

  // Get client IP for rate limiting
  const clientIp = req.socket.remoteAddress || "unknown";

  // Check rate limit
  if (!checkRateLimit(clientIp)) {
    res.writeHead(429);
    res.end(
      JSON.stringify(
        createMcpResponse("", undefined, BRAIN_MCP_ERRORS.RATE_LIMITED),
      ),
    );
    return;
  }

  // Validate API key
  if (!validateApiKey(req)) {
    res.writeHead(401);
    res.end(
      JSON.stringify(
        createMcpResponse("", undefined, BRAIN_MCP_ERRORS.UNAUTHORIZED),
      ),
    );
    return;
  }

  // Parse request body
  let body = "";
  req.on("data", (chunk) => {
    body += chunk;
  });

  req.on("end", async () => {
    state.requestsServed++;
    state.lastRequestAt = Date.now();

    let mcpRequest: BrainMcpRequest;

    try {
      mcpRequest = JSON.parse(body) as BrainMcpRequest;
    } catch {
      res.writeHead(400);
      res.end(
        JSON.stringify(
          createMcpResponse("", undefined, BRAIN_MCP_ERRORS.PARSE_ERROR),
        ),
      );
      return;
    }

    // Handle MCP request
    try {
      if (mcpRequest.method === "tools/call") {
        const { name, arguments: args } = mcpRequest.params;
        const content = await handleToolCall(name, args);
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify(createMcpResponse(mcpRequest.id, content)));
      } else if (mcpRequest.method === "tools/list") {
        const tools = BRAIN_MCP_TOOLS.map((tool: BrainMcpTool) => ({
          name: tool.name,
          description: tool.description,
          inputSchema: tool.inputSchema,
        }));
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(
          JSON.stringify({
            id: mcpRequest.id,
            result: { tools },
          }),
        );
      } else {
        res.writeHead(400);
        res.end(
          JSON.stringify(
            createMcpResponse(
              mcpRequest.id,
              undefined,
              BRAIN_MCP_ERRORS.METHOD_NOT_FOUND,
            ),
          ),
        );
      }
    } catch (error) {
      const mcpError =
        error instanceof Object && "code" in error
          ? (error as McpError)
          : createMcpError(
              MCP_ERROR_CODES.INTERNAL_ERROR,
              error instanceof Error ? error.message : "Unknown error",
            );

      res.writeHead(500);
      res.end(
        JSON.stringify(createMcpResponse(mcpRequest.id, undefined, mcpError)),
      );
    }
  });
};

// Public API

export const start = async (
  brainService: BrainService,
  config?: Partial<BrainMcpServerConfig>,
): Promise<void> => {
  if (state.server) {
    throw new Error(BRAIN_MCP_MESSAGES.SERVER_ALREADY_RUNNING);
  }

  state.config = { ...DEFAULT_BRAIN_MCP_SERVER_CONFIG, ...config };
  state.brainService = brainService;

  return new Promise((resolve, reject) => {
    state.server = createServer(handleRequest);

    state.server.on("error", (error) => {
      state.server = null;
      reject(error);
    });

    state.server.listen(state.config.port, state.config.host, () => {
      state.startTime = Date.now();
      state.requestsServed = 0;
      resolve();
    });
  });
};

export const stop = async (): Promise<void> => {
  if (!state.server) {
    return;
  }

  return new Promise((resolve) => {
    state.server!.close(() => {
      state.server = null;
      state.startTime = null;
      state.connectedClients = 0;
      state.brainService = null;
      resolve();
    });
  });
};

export const getStatus = (): BrainMcpServerStatus => ({
  running: state.server !== null,
  port: state.config.port,
  host: state.config.host,
  connectedClients: state.connectedClients,
  uptime: state.startTime ? Date.now() - state.startTime : 0,
  requestsServed: state.requestsServed,
  lastRequestAt: state.lastRequestAt || undefined,
});

export const addApiKey = (key: string): void => {
  state.apiKeys.add(key);
};

export const removeApiKey = (key: string): void => {
  state.apiKeys.delete(key);
};

export const isRunning = (): boolean => state.server !== null;

export const getConfig = (): BrainMcpServerConfig => ({ ...state.config });

export const updateConfig = (config: Partial<BrainMcpServerConfig>): void => {
  state.config = { ...state.config, ...config };
};

export const getAvailableTools = (): ReadonlyArray<{
  name: string;
  description: string;
}> =>
  BRAIN_MCP_TOOLS.map((t: BrainMcpTool) => ({
    name: t.name,
    description: t.description,
  }));
