import fs from "fs/promises";
import path from "path";
import type { AgentType, ChatSession, ChatMessage } from "@/types/common";
import type { SessionInfo, SubagentSessionConfig } from "@/types/session";
import { DIRS } from "@constants/paths";

/**
 * Extended ChatSession with subagent support
 */
interface SubagentChatSession extends ChatSession {
  parentSessionId?: string;
  isSubagent?: boolean;
  subagentType?: string;
  task?: string;
}

/**
 * Current session state
 */
let currentSession: ChatSession | null = null;

/**
 * Generate unique session ID
 */
const generateId = (): string =>
  `session_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

/**
 * Create a new session
 */
export const createSession = async (agent: AgentType): Promise<ChatSession> => {
  const session: ChatSession = {
    id: generateId(),
    agent,
    messages: [],
    contextFiles: [],
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  currentSession = session;
  await saveSession(session);
  return session;
};

/**
 * Load session by ID
 */
export const loadSession = async (id: string): Promise<ChatSession | null> => {
  try {
    const sessionFile = path.join(DIRS.sessions, `${id}.json`);
    const data = await fs.readFile(sessionFile, "utf-8");
    currentSession = JSON.parse(data);
    return currentSession;
  } catch {
    return null;
  }
};

/**
 * Save session
 */
export const saveSession = async (session?: ChatSession): Promise<void> => {
  const sessionToSave = session ?? currentSession;
  if (!sessionToSave) return;

  try {
    await fs.mkdir(DIRS.sessions, { recursive: true });
    const sessionFile = path.join(DIRS.sessions, `${sessionToSave.id}.json`);
    sessionToSave.updatedAt = Date.now();
    await fs.writeFile(
      sessionFile,
      JSON.stringify(sessionToSave, null, 2),
      "utf-8",
    );
  } catch (error) {
    throw new Error(`Failed to save session: ${error}`);
  }
};

/**
 * Add message to current session
 */
export const addMessage = async (
  role: "user" | "assistant" | "system",
  content: string,
): Promise<void> => {
  if (!currentSession) {
    throw new Error("No active session");
  }

  const message: ChatMessage = {
    role,
    content,
    timestamp: Date.now(),
  };

  currentSession.messages.push(message);
  await saveSession();
};

/**
 * Add context file to current session
 */
export const addContextFile = async (filePath: string): Promise<void> => {
  if (!currentSession) {
    throw new Error("No active session");
  }

  if (!currentSession.contextFiles.includes(filePath)) {
    currentSession.contextFiles.push(filePath);
    await saveSession();
  }
};

/**
 * Remove context file from current session
 */
export const removeContextFile = async (filePath: string): Promise<void> => {
  if (!currentSession) {
    throw new Error("No active session");
  }

  currentSession.contextFiles = currentSession.contextFiles.filter(
    (f) => f !== filePath,
  );
  await saveSession();
};

/**
 * Get current session
 */
export const getCurrentSession = (): ChatSession | null => currentSession;

/**
 * List all sessions
 */
export const listSessions = async (): Promise<ChatSession[]> => {
  try {
    await fs.mkdir(DIRS.sessions, { recursive: true });
    const files = await fs.readdir(DIRS.sessions);
    const sessions: ChatSession[] = [];

    for (const file of files) {
      if (file.endsWith(".json")) {
        const data = await fs.readFile(path.join(DIRS.sessions, file), "utf-8");
        sessions.push(JSON.parse(data));
      }
    }

    return sessions.sort((a, b) => b.updatedAt - a.updatedAt);
  } catch {
    return [];
  }
};

/**
 * Delete session by ID
 */
export const deleteSession = async (id: string): Promise<void> => {
  try {
    const sessionFile = path.join(DIRS.sessions, `${id}.json`);
    await fs.unlink(sessionFile);
    if (currentSession?.id === id) {
      currentSession = null;
    }
  } catch (error) {
    throw new Error(`Failed to delete session: ${error}`);
  }
};

/**
 * Clear all messages in current session
 */
export const clearMessages = async (): Promise<void> => {
  if (!currentSession) {
    throw new Error("No active session");
  }

  currentSession.messages = [];
  await saveSession();
};

/**
 * Get most recent session
 */
export const getMostRecentSession = async (
  workingDir?: string,
): Promise<ChatSession | null> => {
  const sessions = await listSessions();

  if (sessions.length === 0) return null;

  if (workingDir) {
    const filtered = sessions.filter(
      (s) =>
        (s as ChatSession & { workingDirectory?: string }).workingDirectory ===
        workingDir,
    );
    return filtered[0] ?? null;
  }

  return sessions[0];
};

/**
 * Get session summaries for listing
 */
export const getSessionSummaries = async (): Promise<SessionInfo[]> => {
  const sessions = await listSessions();

  return sessions.map((session) => {
    const lastUserMessage = [...session.messages]
      .reverse()
      .find((m) => m.role === "user");

    return {
      id: session.id,
      agent: session.agent,
      messageCount: session.messages.length,
      lastMessage: lastUserMessage?.content?.slice(0, 100),
      workingDirectory: (session as ChatSession & { workingDirectory?: string })
        .workingDirectory,
      createdAt: session.createdAt,
      updatedAt: session.updatedAt,
    };
  });
};

/**
 * Find session by ID prefix or exact match
 */
export const findSession = async (
  idOrPrefix: string,
): Promise<ChatSession | null> => {
  const sessions = await listSessions();

  // Exact match
  let session = sessions.find((s) => s.id === idOrPrefix);
  if (session) return session;

  // Prefix match
  const matches = sessions.filter((s) => s.id.startsWith(idOrPrefix));
  if (matches.length === 1) return matches[0];
  if (matches.length > 1) {
    throw new Error(
      `Ambiguous session ID: ${matches.length} sessions match "${idOrPrefix}"`,
    );
  }

  return null;
};

/**
 * Set working directory for current session
 */
export const setWorkingDirectory = async (dir: string): Promise<void> => {
  if (!currentSession) return;
  (
    currentSession as ChatSession & { workingDirectory?: string }
  ).workingDirectory = dir;
  await saveSession();
};

/**
 * Create a subagent session (child of a parent session)
 * Used by task_agent for proper session-based isolation like opencode
 */
export const createSubagentSession = async (
  config: SubagentSessionConfig,
): Promise<SubagentChatSession> => {
  const session: SubagentChatSession = {
    id: generateId(),
    agent: "subagent" as AgentType,
    messages: [],
    contextFiles: config.contextFiles ?? [],
    createdAt: Date.now(),
    updatedAt: Date.now(),
    parentSessionId: config.parentSessionId,
    isSubagent: true,
    subagentType: config.subagentType,
    task: config.task,
  };

  // Set working directory
  (session as SubagentChatSession & { workingDirectory?: string }).workingDirectory =
    config.workingDirectory;

  // Save but don't set as current (subagents run independently)
  await saveSession(session);
  return session;
};

/**
 * Get all subagent sessions for a parent session
 */
export const getSubagentSessions = async (
  parentSessionId: string,
): Promise<SubagentChatSession[]> => {
  const sessions = await listSessions();
  return sessions.filter(
    (s) => (s as SubagentChatSession).parentSessionId === parentSessionId,
  ) as SubagentChatSession[];
};

/**
 * Add message to a specific session (for subagents)
 */
export const addMessageToSession = async (
  sessionId: string,
  role: "user" | "assistant" | "system" | "tool",
  content: string,
): Promise<void> => {
  const session = await loadSession(sessionId);
  if (!session) {
    throw new Error(`Session not found: ${sessionId}`);
  }

  const message: ChatMessage = {
    role: role as "user" | "assistant" | "system",
    content,
    timestamp: Date.now(),
  };

  session.messages.push(message);
  await saveSession(session);
};

/**
 * Update subagent session with result
 */
export const completeSubagentSession = async (
  sessionId: string,
  result: { success: boolean; output: string; error?: string },
): Promise<void> => {
  const session = await loadSession(sessionId);
  if (!session) return;

  // Add final result as assistant message
  const resultContent = result.success
    ? `## Subagent Result\n\n${result.output}`
    : `## Subagent Error\n\n${result.error}\n\n${result.output}`;

  await addMessageToSession(sessionId, "assistant", resultContent);
};

// Re-export types
export type { SessionInfo, SubagentSessionConfig } from "@/types/session";
