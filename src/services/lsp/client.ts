/**
 * LSP Client Implementation
 *
 * Handles LSP protocol communication with language servers
 */

import type { ChildProcess } from "child_process";
import { createInterface } from "readline";
import { EventEmitter } from "events";
import { getLanguageId } from "@services/lsp/language";

export interface Position {
  line: number;
  character: number;
}

export interface Range {
  start: Position;
  end: Position;
}

export interface Location {
  uri: string;
  range: Range;
}

export interface Diagnostic {
  range: Range;
  severity?: 1 | 2 | 3 | 4; // Error, Warning, Info, Hint
  code?: string | number;
  source?: string;
  message: string;
}

export interface CompletionItem {
  label: string;
  kind?: number;
  detail?: string;
  documentation?: string | { kind: string; value: string };
  insertText?: string;
}

export interface DocumentSymbol {
  name: string;
  kind: number;
  range: Range;
  selectionRange: Range;
  children?: DocumentSymbol[];
}

export interface Hover {
  contents: string | { kind: string; value: string } | Array<string | { kind: string; value: string }>;
  range?: Range;
}

export interface LSPClientInfo {
  serverId: string;
  root: string;
  capabilities: Record<string, unknown>;
}

export interface LSPClientEvents {
  diagnostics: (uri: string, diagnostics: Diagnostic[]) => void;
  error: (error: Error) => void;
  close: () => void;
}

type RequestId = number;

interface PendingRequest {
  resolve: (result: unknown) => void;
  reject: (error: Error) => void;
}

export class LSPClient extends EventEmitter {
  private process: ChildProcess;
  private serverId: string;
  private root: string;
  private requestId: RequestId = 0;
  private pendingRequests: Map<RequestId, PendingRequest> = new Map();
  private initialized: boolean = false;
  private capabilities: Record<string, unknown> = {};
  private openFiles: Map<string, number> = new Map(); // uri -> version
  private diagnosticsMap: Map<string, Diagnostic[]> = new Map();
  private buffer: string = "";

  constructor(process: ChildProcess, serverId: string, root: string) {
    super();
    this.process = process;
    this.serverId = serverId;
    this.root = root;

    this.setupHandlers();
  }

  private setupHandlers(): void {
    const rl = createInterface({
      input: this.process.stdout!,
      crlfDelay: Infinity,
    });

    let contentLength = 0;
    let headers = true;

    rl.on("line", (line) => {
      if (headers) {
        if (line.startsWith("Content-Length:")) {
          contentLength = parseInt(line.slice(15).trim(), 10);
        } else if (line === "") {
          headers = false;
          this.buffer = "";
        }
      } else {
        this.buffer += line;
        if (this.buffer.length >= contentLength) {
          try {
            const message = JSON.parse(this.buffer);
            this.handleMessage(message);
          } catch {
            // Ignore parse errors
          }
          headers = true;
          contentLength = 0;
          this.buffer = "";
        }
      }
    });

    this.process.on("close", () => {
      this.emit("close");
    });

    this.process.on("error", (err) => {
      this.emit("error", err);
    });
  }

  private handleMessage(message: {
    id?: RequestId;
    method?: string;
    result?: unknown;
    error?: { code: number; message: string };
    params?: unknown;
  }): void {
    // Response to our request
    if (message.id !== undefined && this.pendingRequests.has(message.id)) {
      const pending = this.pendingRequests.get(message.id)!;
      this.pendingRequests.delete(message.id);

      if (message.error) {
        pending.reject(new Error(message.error.message));
      } else {
        pending.resolve(message.result);
      }
      return;
    }

    // Notification from server
    if (message.method) {
      this.handleNotification(message.method, message.params);
    }
  }

  private handleNotification(method: string, params: unknown): void {
    if (method === "textDocument/publishDiagnostics") {
      const { uri, diagnostics } = params as { uri: string; diagnostics: Diagnostic[] };
      this.diagnosticsMap.set(uri, diagnostics);
      this.emit("diagnostics", uri, diagnostics);
    }
    // Handle other notifications as needed
  }

  private send(message: Record<string, unknown>): void {
    const content = JSON.stringify(message);
    const header = `Content-Length: ${Buffer.byteLength(content)}\r\n\r\n`;
    this.process.stdin!.write(header + content);
  }

  private async request<T>(method: string, params?: unknown): Promise<T> {
    const id = ++this.requestId;

    return new Promise<T>((resolve, reject) => {
      this.pendingRequests.set(id, {
        resolve: resolve as (result: unknown) => void,
        reject,
      });

      this.send({
        jsonrpc: "2.0",
        id,
        method,
        params,
      });

      // Timeout after 30 seconds
      setTimeout(() => {
        if (this.pendingRequests.has(id)) {
          this.pendingRequests.delete(id);
          reject(new Error(`Request ${method} timed out`));
        }
      }, 30000);
    });
  }

  private notify(method: string, params?: unknown): void {
    this.send({
      jsonrpc: "2.0",
      method,
      params,
    });
  }

  async initialize(): Promise<void> {
    if (this.initialized) return;

    const result = await this.request<{ capabilities: Record<string, unknown> }>("initialize", {
      processId: process.pid,
      rootUri: `file://${this.root}`,
      rootPath: this.root,
      capabilities: {
        textDocument: {
          synchronization: {
            didSave: true,
            didOpen: true,
            didClose: true,
            didChange: 2, // Incremental
          },
          completion: {
            completionItem: {
              snippetSupport: true,
              documentationFormat: ["markdown", "plaintext"],
            },
          },
          hover: {
            contentFormat: ["markdown", "plaintext"],
          },
          definition: {
            linkSupport: true,
          },
          references: {},
          documentSymbol: {
            hierarchicalDocumentSymbolSupport: true,
          },
          publishDiagnostics: {
            relatedInformation: true,
          },
        },
        workspace: {
          workspaceFolders: true,
          didChangeConfiguration: {
            dynamicRegistration: true,
          },
        },
      },
      workspaceFolders: [
        {
          uri: `file://${this.root}`,
          name: this.root.split("/").pop(),
        },
      ],
    });

    this.capabilities = result.capabilities;
    this.initialized = true;

    this.notify("initialized", {});
  }

  async openFile(filePath: string, content: string): Promise<void> {
    const uri = `file://${filePath}`;
    const languageId = getLanguageId(filePath) ?? "plaintext";
    const version = 1;

    this.openFiles.set(uri, version);

    this.notify("textDocument/didOpen", {
      textDocument: {
        uri,
        languageId,
        version,
        text: content,
      },
    });
  }

  async updateFile(filePath: string, content: string): Promise<void> {
    const uri = `file://${filePath}`;
    const currentVersion = this.openFiles.get(uri) ?? 0;
    const newVersion = currentVersion + 1;

    this.openFiles.set(uri, newVersion);

    this.notify("textDocument/didChange", {
      textDocument: { uri, version: newVersion },
      contentChanges: [{ text: content }],
    });
  }

  async closeFile(filePath: string): Promise<void> {
    const uri = `file://${filePath}`;
    this.openFiles.delete(uri);
    this.diagnosticsMap.delete(uri);

    this.notify("textDocument/didClose", {
      textDocument: { uri },
    });
  }

  async getHover(filePath: string, position: Position): Promise<Hover | null> {
    const uri = `file://${filePath}`;

    try {
      return await this.request<Hover | null>("textDocument/hover", {
        textDocument: { uri },
        position,
      });
    } catch {
      return null;
    }
  }

  async getDefinition(filePath: string, position: Position): Promise<Location | Location[] | null> {
    const uri = `file://${filePath}`;

    try {
      return await this.request<Location | Location[] | null>("textDocument/definition", {
        textDocument: { uri },
        position,
      });
    } catch {
      return null;
    }
  }

  async getReferences(filePath: string, position: Position, includeDeclaration = true): Promise<Location[]> {
    const uri = `file://${filePath}`;

    try {
      const result = await this.request<Location[] | null>("textDocument/references", {
        textDocument: { uri },
        position,
        context: { includeDeclaration },
      });
      return result ?? [];
    } catch {
      return [];
    }
  }

  async getCompletions(filePath: string, position: Position): Promise<CompletionItem[]> {
    const uri = `file://${filePath}`;

    try {
      const result = await this.request<{ items: CompletionItem[] } | CompletionItem[] | null>(
        "textDocument/completion",
        {
          textDocument: { uri },
          position,
        },
      );

      if (!result) return [];
      return Array.isArray(result) ? result : result.items;
    } catch {
      return [];
    }
  }

  async getDocumentSymbols(filePath: string): Promise<DocumentSymbol[]> {
    const uri = `file://${filePath}`;

    try {
      const result = await this.request<DocumentSymbol[] | null>("textDocument/documentSymbol", {
        textDocument: { uri },
      });
      return result ?? [];
    } catch {
      return [];
    }
  }

  getDiagnostics(filePath?: string): Diagnostic[] {
    if (filePath) {
      const uri = `file://${filePath}`;
      return this.diagnosticsMap.get(uri) ?? [];
    }

    // Return all diagnostics
    const all: Diagnostic[] = [];
    for (const diagnostics of this.diagnosticsMap.values()) {
      all.push(...diagnostics);
    }
    return all;
  }

  getAllDiagnostics(): Map<string, Diagnostic[]> {
    return new Map(this.diagnosticsMap);
  }

  getInfo(): LSPClientInfo {
    return {
      serverId: this.serverId,
      root: this.root,
      capabilities: this.capabilities,
    };
  }

  isFileOpen(filePath: string): boolean {
    const uri = `file://${filePath}`;
    return this.openFiles.has(uri);
  }

  shutdown(): void {
    this.request("shutdown", null)
      .then(() => {
        this.notify("exit");
        this.process.kill();
      })
      .catch(() => {
        this.process.kill();
      });
  }
}

export const createLSPClient = (
  process: ChildProcess,
  serverId: string,
  root: string,
): LSPClient => {
  return new LSPClient(process, serverId, root);
};
