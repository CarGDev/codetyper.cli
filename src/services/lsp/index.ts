/**
 * LSP Service - Main entry point for language server functionality
 *
 * Provides:
 * - Language detection
 * - Server startup/shutdown management
 * - Real-time diagnostics
 * - Code completion
 * - Document symbols
 * - References finding
 * - Definition jumping
 * - Hover information
 */

import fs from "fs/promises";
import path from "path";
import { EventEmitter } from "events";
import {
  LSPClient,
  createLSPClient,
  type Diagnostic,
  type Position,
  type Location,
  type CompletionItem,
  type DocumentSymbol,
  type Hover,
} from "@services/lsp/client";
import {
  getServersForFile,
  findRootForServer,
  spawnServer,
  type ServerInfo,
} from "@services/lsp/server";
import { getLanguageId } from "@services/lsp/language";

interface LSPState {
  clients: Map<string, LSPClient>; // key: `${root}:${serverId}`
  spawning: Map<string, Promise<LSPClient | null>>;
  broken: Set<string>;
}

const state: LSPState = {
  clients: new Map(),
  spawning: new Map(),
  broken: new Set(),
};

const events = new EventEmitter();

const getClientKey = (root: string, serverId: string): string => {
  return `${root}:${serverId}`;
};

const getClientsForFile = async (filePath: string): Promise<LSPClient[]> => {
  const servers = getServersForFile(filePath);
  const clients: LSPClient[] = [];

  for (const server of servers) {
    const root = await findRootForServer(filePath, server);
    if (!root) continue;

    const key = getClientKey(root, server.id);

    // Skip broken servers
    if (state.broken.has(key)) continue;

    // Check for existing client
    if (state.clients.has(key)) {
      clients.push(state.clients.get(key)!);
      continue;
    }

    // Check for in-flight spawn
    if (state.spawning.has(key)) {
      const client = await state.spawning.get(key);
      if (client) clients.push(client);
      continue;
    }

    // Spawn new client
    const spawnPromise = spawnClient(server, root);
    state.spawning.set(key, spawnPromise);

    try {
      const client = await spawnPromise;
      if (client) {
        clients.push(client);
      }
    } finally {
      state.spawning.delete(key);
    }
  }

  return clients;
};

const spawnClient = async (
  server: ServerInfo,
  root: string,
): Promise<LSPClient | null> => {
  const key = getClientKey(root, server.id);

  try {
    const handle = await spawnServer(server, root);
    if (!handle) {
      state.broken.add(key);
      return null;
    }

    const client = createLSPClient(handle.process, server.id, root);

    client.on("close", () => {
      state.clients.delete(key);
      events.emit("clientClosed", { serverId: server.id, root });
    });

    client.on("error", () => {
      state.clients.delete(key);
      state.broken.add(key);
    });

    client.on("diagnostics", (uri: string, diagnostics: Diagnostic[]) => {
      events.emit("diagnostics", { uri, diagnostics, serverId: server.id });
    });

    await client.initialize();
    state.clients.set(key, client);

    events.emit("clientConnected", { serverId: server.id, root });

    return client;
  } catch {
    state.broken.add(key);
    return null;
  }
};

// Public API

export const openFile = async (filePath: string): Promise<void> => {
  const absolutePath = path.resolve(filePath);
  const clients = await getClientsForFile(absolutePath);

  if (clients.length === 0) return;

  const content = await fs.readFile(absolutePath, "utf-8");

  for (const client of clients) {
    if (!client.isFileOpen(absolutePath)) {
      await client.openFile(absolutePath, content);
    }
  }
};

export const updateFile = async (
  filePath: string,
  content: string,
): Promise<void> => {
  const absolutePath = path.resolve(filePath);
  const clients = await getClientsForFile(absolutePath);

  for (const client of clients) {
    if (client.isFileOpen(absolutePath)) {
      await client.updateFile(absolutePath, content);
    } else {
      await client.openFile(absolutePath, content);
    }
  }
};

export const closeFile = async (filePath: string): Promise<void> => {
  const absolutePath = path.resolve(filePath);
  const clients = await getClientsForFile(absolutePath);

  for (const client of clients) {
    if (client.isFileOpen(absolutePath)) {
      await client.closeFile(absolutePath);
    }
  }
};

export const getHover = async (
  filePath: string,
  position: Position,
): Promise<Hover | null> => {
  const absolutePath = path.resolve(filePath);
  const clients = await getClientsForFile(absolutePath);

  for (const client of clients) {
    const hover = await client.getHover(absolutePath, position);
    if (hover) return hover;
  }

  return null;
};

export const getDefinition = async (
  filePath: string,
  position: Position,
): Promise<Location | Location[] | null> => {
  const absolutePath = path.resolve(filePath);
  const clients = await getClientsForFile(absolutePath);

  for (const client of clients) {
    const definition = await client.getDefinition(absolutePath, position);
    if (definition) return definition;
  }

  return null;
};

export const getReferences = async (
  filePath: string,
  position: Position,
  includeDeclaration = true,
): Promise<Location[]> => {
  const absolutePath = path.resolve(filePath);
  const clients = await getClientsForFile(absolutePath);

  const allRefs: Location[] = [];
  for (const client of clients) {
    const refs = await client.getReferences(
      absolutePath,
      position,
      includeDeclaration,
    );
    allRefs.push(...refs);
  }

  // Deduplicate by URI and range
  const seen = new Set<string>();
  return allRefs.filter((loc) => {
    const key = `${loc.uri}:${loc.range.start.line}:${loc.range.start.character}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

export const getCompletions = async (
  filePath: string,
  position: Position,
): Promise<CompletionItem[]> => {
  const absolutePath = path.resolve(filePath);
  const clients = await getClientsForFile(absolutePath);

  const allCompletions: CompletionItem[] = [];
  for (const client of clients) {
    const completions = await client.getCompletions(absolutePath, position);
    allCompletions.push(...completions);
  }

  return allCompletions;
};

export const getDocumentSymbols = async (
  filePath: string,
): Promise<DocumentSymbol[]> => {
  const absolutePath = path.resolve(filePath);
  const clients = await getClientsForFile(absolutePath);

  for (const client of clients) {
    const symbols = await client.getDocumentSymbols(absolutePath);
    if (symbols.length > 0) return symbols;
  }

  return [];
};

export const getDiagnostics = (
  filePath?: string,
): Map<string, Diagnostic[]> => {
  const allDiagnostics = new Map<string, Diagnostic[]>();

  for (const client of state.clients.values()) {
    const clientDiagnostics = client.getAllDiagnostics();
    for (const [uri, diagnostics] of clientDiagnostics) {
      if (filePath) {
        const expectedUri = `file://${path.resolve(filePath)}`;
        if (uri !== expectedUri) continue;
      }

      const existing = allDiagnostics.get(uri) ?? [];
      allDiagnostics.set(uri, [...existing, ...diagnostics]);
    }
  }

  return allDiagnostics;
};

export const getStatus = (): {
  connected: Array<{ serverId: string; root: string }>;
  broken: string[];
} => {
  const connected = Array.from(state.clients.values()).map((client) =>
    client.getInfo(),
  );
  const broken = Array.from(state.broken);

  return { connected, broken };
};

export const hasSupport = (filePath: string): boolean => {
  const servers = getServersForFile(filePath);
  return servers.length > 0;
};

export const getLanguage = (filePath: string): string | null => {
  return getLanguageId(filePath);
};

export const shutdown = (): void => {
  for (const client of state.clients.values()) {
    client.shutdown();
  }
  state.clients.clear();
  state.spawning.clear();
  state.broken.clear();
};

export const onDiagnostics = (
  callback: (data: {
    uri: string;
    diagnostics: Diagnostic[];
    serverId: string;
  }) => void,
): (() => void) => {
  events.on("diagnostics", callback);
  return () => events.off("diagnostics", callback);
};

export const onClientConnected = (
  callback: (data: { serverId: string; root: string }) => void,
): (() => void) => {
  events.on("clientConnected", callback);
  return () => events.off("clientConnected", callback);
};

export const onClientClosed = (
  callback: (data: { serverId: string; root: string }) => void,
): (() => void) => {
  events.on("clientClosed", callback);
  return () => events.off("clientClosed", callback);
};

export const lspService = {
  openFile,
  updateFile,
  closeFile,
  getHover,
  getDefinition,
  getReferences,
  getCompletions,
  getDocumentSymbols,
  getDiagnostics,
  getStatus,
  hasSupport,
  getLanguage,
  shutdown,
  onDiagnostics,
  onClientConnected,
  onClientClosed,
};

// Re-export types
export type {
  Diagnostic,
  Position,
  Range,
  Location,
  CompletionItem,
  DocumentSymbol,
  Hover,
} from "@services/lsp/client";

export { getLanguageId, getSupportedExtensions } from "@services/lsp/language";
export { SERVERS, getAvailableServers } from "@services/lsp/server";
