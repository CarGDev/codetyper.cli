/**
 * MCP Client - Manages connection to a single MCP server
 */

import { spawn, type ChildProcess } from "child_process";
import type {
  MCPServerConfig,
  MCPServerInstance,
  MCPToolDefinition,
  MCPResourceDefinition,
  MCPToolCallResult,
  MCPConnectionState,
} from "@/types/mcp";

/**
 * JSON-RPC message types
 */
interface JsonRpcRequest {
  jsonrpc: "2.0";
  id: number;
  method: string;
  params?: unknown;
}

interface JsonRpcResponse {
  jsonrpc: "2.0";
  id: number;
  result?: unknown;
  error?: {
    code: number;
    message: string;
    data?: unknown;
  };
}

/**
 * MCP Client class for managing a single server connection
 */
export class MCPClient {
  private config: MCPServerConfig;
  private process: ChildProcess | null = null;
  private state: MCPConnectionState = "disconnected";
  private tools: MCPToolDefinition[] = [];
  private resources: MCPResourceDefinition[] = [];
  private error: string | undefined;
  private requestId = 0;
  private pendingRequests: Map<
    number,
    {
      resolve: (value: unknown) => void;
      reject: (error: Error) => void;
    }
  > = new Map();
  private buffer = "";

  constructor(config: MCPServerConfig) {
    this.config = config;
  }

  /**
   * Get server instance state
   */
  getInstance(): MCPServerInstance {
    return {
      config: this.config,
      state: this.state,
      tools: this.tools,
      resources: this.resources,
      error: this.error,
      pid: this.process?.pid,
    };
  }

  /**
   * Connect to the MCP server
   */
  async connect(): Promise<void> {
    if (this.state === "connected" || this.state === "connecting") {
      return;
    }

    this.state = "connecting";
    this.error = undefined;

    try {
      if (this.config.transport === "stdio" || !this.config.transport) {
        await this.connectStdio();
      } else {
        throw new Error(
          `Transport type '${this.config.transport}' not yet supported`,
        );
      }

      // Initialize the connection
      await this.initialize();

      // Discover tools and resources
      await this.discoverCapabilities();

      this.state = "connected";
    } catch (err) {
      this.state = "error";
      this.error = err instanceof Error ? err.message : String(err);
      throw err;
    }
  }

  /**
   * Connect via stdio transport
   */
  private async connectStdio(): Promise<void> {
    return new Promise((resolve, reject) => {
      const env = {
        ...process.env,
        ...this.config.env,
      };

      this.process = spawn(this.config.command, this.config.args || [], {
        stdio: ["pipe", "pipe", "pipe"],
        env,
      });

      if (!this.process.stdout || !this.process.stdin) {
        reject(new Error("Failed to create stdio pipes"));
        return;
      }

      this.process.stdout.on("data", (data: Buffer) => {
        this.handleData(data.toString());
      });

      this.process.stderr?.on("data", (data: Buffer) => {
        console.error(`[MCP ${this.config.name}] stderr:`, data.toString());
      });

      this.process.on("error", (err) => {
        this.state = "error";
        this.error = err.message;
        reject(err);
      });

      this.process.on("exit", (code) => {
        this.state = "disconnected";
        if (code !== 0) {
          this.error = `Process exited with code ${code}`;
        }
      });

      // Give the process a moment to start
      setTimeout(resolve, 100);
    });
  }

  /**
   * Handle incoming data from the server
   */
  private handleData(data: string): void {
    this.buffer += data;

    // Process complete JSON-RPC messages (newline-delimited)
    const lines = this.buffer.split("\n");
    this.buffer = lines.pop() || "";

    for (const line of lines) {
      if (line.trim()) {
        try {
          const message = JSON.parse(line) as JsonRpcResponse;
          this.handleMessage(message);
        } catch {
          // Ignore parse errors for incomplete messages
        }
      }
    }
  }

  /**
   * Handle a JSON-RPC message
   */
  private handleMessage(message: JsonRpcResponse): void {
    const pending = this.pendingRequests.get(message.id);
    if (pending) {
      this.pendingRequests.delete(message.id);
      if (message.error) {
        pending.reject(new Error(message.error.message));
      } else {
        pending.resolve(message.result);
      }
    }
  }

  /**
   * Send a JSON-RPC request
   */
  private async sendRequest(
    method: string,
    params?: unknown,
  ): Promise<unknown> {
    if (!this.process?.stdin) {
      throw new Error("Not connected");
    }

    const id = ++this.requestId;
    const request: JsonRpcRequest = {
      jsonrpc: "2.0",
      id,
      method,
      params,
    };

    return new Promise((resolve, reject) => {
      this.pendingRequests.set(id, { resolve, reject });

      const timeout = setTimeout(() => {
        this.pendingRequests.delete(id);
        reject(new Error("Request timeout"));
      }, 30000);

      this.process!.stdin!.write(JSON.stringify(request) + "\n", (err) => {
        if (err) {
          clearTimeout(timeout);
          this.pendingRequests.delete(id);
          reject(err);
        }
      });
    });
  }

  /**
   * Initialize the MCP connection
   */
  private async initialize(): Promise<void> {
    await this.sendRequest("initialize", {
      protocolVersion: "2024-11-05",
      capabilities: {
        tools: {},
        resources: {},
      },
      clientInfo: {
        name: "codetyper",
        version: "0.1.0",
      },
    });

    // Send initialized notification
    if (this.process?.stdin) {
      this.process.stdin.write(
        JSON.stringify({
          jsonrpc: "2.0",
          method: "notifications/initialized",
        }) + "\n",
      );
    }
  }

  /**
   * Discover available tools and resources
   */
  private async discoverCapabilities(): Promise<void> {
    // Get tools
    try {
      const toolsResult = (await this.sendRequest("tools/list")) as {
        tools?: MCPToolDefinition[];
      };
      this.tools = toolsResult?.tools || [];
    } catch {
      this.tools = [];
    }

    // Get resources
    try {
      const resourcesResult = (await this.sendRequest("resources/list")) as {
        resources?: MCPResourceDefinition[];
      };
      this.resources = resourcesResult?.resources || [];
    } catch {
      this.resources = [];
    }
  }

  /**
   * Call a tool on the server
   */
  async callTool(
    toolName: string,
    args: Record<string, unknown>,
  ): Promise<MCPToolCallResult> {
    if (this.state !== "connected") {
      return {
        success: false,
        error: "Not connected to server",
      };
    }

    try {
      const result = await this.sendRequest("tools/call", {
        name: toolName,
        arguments: args,
      });

      return {
        success: true,
        content: result,
      };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : String(err),
      };
    }
  }

  /**
   * Read a resource from the server
   */
  async readResource(
    uri: string,
  ): Promise<{ content: string; mimeType?: string } | null> {
    if (this.state !== "connected") {
      return null;
    }

    try {
      const result = (await this.sendRequest("resources/read", { uri })) as {
        contents?: Array<{ text?: string; mimeType?: string }>;
      };

      if (result?.contents?.[0]) {
        return {
          content: result.contents[0].text || "",
          mimeType: result.contents[0].mimeType,
        };
      }
      return null;
    } catch {
      return null;
    }
  }

  /**
   * Disconnect from the server
   */
  async disconnect(): Promise<void> {
    if (this.process) {
      this.process.kill();
      this.process = null;
    }
    this.state = "disconnected";
    this.tools = [];
    this.resources = [];
    this.pendingRequests.clear();
  }

  /**
   * Get connection state
   */
  getState(): MCPConnectionState {
    return this.state;
  }

  /**
   * Get available tools
   */
  getTools(): MCPToolDefinition[] {
    return this.tools;
  }

  /**
   * Get available resources
   */
  getResources(): MCPResourceDefinition[] {
    return this.resources;
  }
}
