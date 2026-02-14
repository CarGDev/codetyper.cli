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
  /** Base URL for http / sse transport */
  private httpUrl: string | null = null;
  /** Session URL returned by the server after SSE handshake (if any) */
  private httpSessionUrl: string | null = null;
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
   * Resolve effective transport: `type` takes precedence over legacy `transport`
   */
  private get transport(): "stdio" | "sse" | "http" {
    return this.config.type ?? "stdio";
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
      const t = this.transport;
      if (t === "stdio") {
        await this.connectStdio();
      } else if (t === "http" || t === "sse") {
        await this.connectHttp();
      } else {
        throw new Error(`Transport type '${t}' is not supported`);
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
    if (!this.config.command) {
      throw new Error("Command is required for stdio transport");
    }

    return new Promise((resolve, reject) => {
      const env = {
        ...process.env,
        ...this.config.env,
      };

      this.process = spawn(this.config.command!, this.config.args || [], {
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

      // Give the stdio process a moment to start
      setTimeout(resolve, 100);
    });
  }

  /**
   * Connect via HTTP (Streamable HTTP) transport.
   * The server URL is used directly for JSON-RPC over HTTP POST.
   */
  private async connectHttp(): Promise<void> {
    const url = this.config.url;
    if (!url) {
      throw new Error("URL is required for http/sse transport");
    }
    this.httpUrl = url;

    // Verify the server is reachable with a simple OPTIONS/HEAD check
    try {
      const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ jsonrpc: "2.0", id: 0, method: "ping" }) });
      // Even a 4xx/5xx means the server is reachable; we'll handle errors in initialize()
      if (!res.ok && res.status >= 500) {
        throw new Error(`Server returned ${res.status}: ${res.statusText}`);
      }
    } catch (err) {
      if (err instanceof TypeError) {
        // Network/fetch error
        throw new Error(`Cannot reach MCP server at ${url}: ${(err as Error).message}`);
      }
      // Other errors (like 400) are OK — the server is reachable
    }
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
   * Send a JSON-RPC request (dispatches to stdio or http)
   */
  private async sendRequest(
    method: string,
    params?: unknown,
  ): Promise<unknown> {
    if (this.httpUrl) {
      return this.sendHttpRequest(method, params);
    }
    return this.sendStdioRequest(method, params);
  }

  /**
   * Send a JSON-RPC request via stdio
   */
  private async sendStdioRequest(
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
   * Send a JSON-RPC request via HTTP POST
   */
  private async sendHttpRequest(
    method: string,
    params?: unknown,
  ): Promise<unknown> {
    const url = this.httpSessionUrl ?? this.httpUrl!;
    const id = ++this.requestId;
    const body: JsonRpcRequest = { jsonrpc: "2.0", id, method, params };

    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json, text/event-stream",
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(30000),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`MCP HTTP error ${res.status}: ${text || res.statusText}`);
    }

    // Capture session URL from Mcp-Session header if present
    const sessionHeader = res.headers.get("mcp-session");
    if (sessionHeader && !this.httpSessionUrl) {
      // If it's a full URL use it; otherwise it's a session id
      this.httpSessionUrl = sessionHeader.startsWith("http")
        ? sessionHeader
        : this.httpUrl!;
    }

    const contentType = res.headers.get("content-type") ?? "";

    // Handle SSE responses (text/event-stream) — collect the last JSON-RPC result
    if (contentType.includes("text/event-stream")) {
      const text = await res.text();
      let lastResult: unknown = undefined;
      for (const line of text.split("\n")) {
        if (line.startsWith("data: ")) {
          const json = line.slice(6).trim();
          if (json && json !== "[DONE]") {
            try {
              const parsed = JSON.parse(json) as JsonRpcResponse;
              if (parsed.error) throw new Error(parsed.error.message);
              lastResult = parsed.result;
            } catch {
              // skip unparseable lines
            }
          }
        }
      }
      return lastResult;
    }

    // Standard JSON response
    const json = (await res.json()) as JsonRpcResponse;
    if (json.error) {
      throw new Error(json.error.message);
    }
    return json.result;
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
    if (this.httpUrl) {
      // For HTTP transport, send as a JSON-RPC notification (no id)
      const url = this.httpSessionUrl ?? this.httpUrl;
      await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jsonrpc: "2.0",
          method: "notifications/initialized",
        }),
      }).catch(() => { /* ignore notification failures */ });
    } else if (this.process?.stdin) {
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
    this.httpUrl = null;
    this.httpSessionUrl = null;
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
