/**
 * Brain Service
 *
 * Business logic layer for the CodeTyper Brain integration.
 * Provides context injection, knowledge recall, and learning capabilities.
 */

import fs from "fs/promises";
import { DIRS, FILES } from "@constants/paths";
import { BRAIN_DEFAULTS, BRAIN_ERRORS, BRAIN_DISABLED } from "@constants/brain";
import * as brainApi from "@api/brain";
import type {
  BrainCredentials,
  BrainState,
  BrainConnectionStatus,
  BrainUser,
  BrainConcept,
  BrainRecallResponse,
  BrainExtractResponse,
} from "@/types/brain";

// ============================================================================
// State Management (Singleton via Closure)
// ============================================================================

interface VarsFile {
  brainApiKey?: string;
  brainJwtToken?: string;
}

let brainState: BrainState = {
  status: "disconnected",
  user: null,
  projectId: BRAIN_DEFAULTS.PROJECT_ID,
  knowledgeCount: 0,
  memoryCount: 0,
  lastError: null,
};

let cachedCredentials: BrainCredentials | null = null;
let cachedVars: VarsFile | null = null;

// ============================================================================
// Vars File Management
// ============================================================================

/**
 * Load vars file from disk
 */
const loadVarsFile = async (): Promise<VarsFile> => {
  if (cachedVars) {
    return cachedVars;
  }

  try {
    const data = await fs.readFile(FILES.vars, "utf-8");
    cachedVars = JSON.parse(data) as VarsFile;
    return cachedVars;
  } catch {
    return {};
  }
};

/**
 * Save vars file to disk
 */
const saveVarsFile = async (vars: VarsFile): Promise<void> => {
  try {
    await fs.mkdir(DIRS.config, { recursive: true });
    await fs.writeFile(FILES.vars, JSON.stringify(vars, null, 2), "utf-8");
    cachedVars = vars;
  } catch (error) {
    throw new Error(`Failed to save vars file: ${error}`);
  }
};

// ============================================================================
// Credentials Management
// ============================================================================

/**
 * Get path to brain credentials file
 */
const getCredentialsPath = (): string => {
  return `${DIRS.data}/brain-credentials.json`;
};

/**
 * Load brain credentials from disk
 */
export const loadCredentials = async (): Promise<BrainCredentials | null> => {
  if (cachedCredentials) {
    return cachedCredentials;
  }

  try {
    const data = await fs.readFile(getCredentialsPath(), "utf-8");
    cachedCredentials = JSON.parse(data) as BrainCredentials;
    return cachedCredentials;
  } catch {
    return null;
  }
};

/**
 * Save brain credentials to disk
 */
export const saveCredentials = async (
  credentials: BrainCredentials,
): Promise<void> => {
  try {
    await fs.mkdir(DIRS.data, { recursive: true });
    await fs.writeFile(
      getCredentialsPath(),
      JSON.stringify(credentials, null, 2),
      "utf-8",
    );
    cachedCredentials = credentials;
  } catch (error) {
    throw new Error(`Failed to save brain credentials: ${error}`);
  }
};

/**
 * Clear brain credentials
 */
export const clearCredentials = async (): Promise<void> => {
  try {
    await fs.unlink(getCredentialsPath());
    cachedCredentials = null;
  } catch {
    // File may not exist, ignore
  }

  // Also clear vars file entries
  try {
    const vars = await loadVarsFile();
    await saveVarsFile({
      ...vars,
      brainApiKey: undefined,
      brainJwtToken: undefined,
    });
  } catch {
    // Ignore errors
  }
};

/**
 * Get API key from vars file or environment
 */
export const getApiKey = async (): Promise<string | undefined> => {
  // First check environment variable
  const envKey = process.env.CODETYPER_BRAIN_API_KEY;
  if (envKey) {
    return envKey;
  }

  // Then check vars file
  const vars = await loadVarsFile();
  return vars.brainApiKey;
};

/**
 * Get JWT token from vars file
 */
export const getJwtToken = async (): Promise<string | undefined> => {
  const vars = await loadVarsFile();
  return vars.brainJwtToken;
};

/**
 * Set API key in vars file
 */
export const setApiKey = async (apiKey: string): Promise<void> => {
  const vars = await loadVarsFile();
  await saveVarsFile({ ...vars, brainApiKey: apiKey });
};

/**
 * Set JWT token in vars file
 */
export const setJwtToken = async (jwtToken: string): Promise<void> => {
  const vars = await loadVarsFile();
  await saveVarsFile({ ...vars, brainJwtToken: jwtToken });
};

// ============================================================================
// Authentication
// ============================================================================

/**
 * Login to Brain service
 */
export const login = async (
  email: string,
  password: string,
): Promise<{ success: boolean; user?: BrainUser; error?: string }> => {
  try {
    updateState({ status: "connecting" });

    const response = await brainApi.login(email, password);

    if (response.success && response.data) {
      const credentials: BrainCredentials = {
        accessToken: response.data.access_token,
        refreshToken: response.data.refresh_token,
        expiresAt: response.data.expires_at,
        user: response.data.user,
      };

      await saveCredentials(credentials);

      updateState({
        status: "connected",
        user: response.data.user,
        lastError: null,
      });

      return { success: true, user: response.data.user };
    }

    updateState({ status: "error", lastError: "Login failed" });
    return { success: false, error: "Login failed" };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    updateState({ status: "error", lastError: errorMessage });
    return { success: false, error: errorMessage };
  }
};

/**
 * Register a new account
 */
export const register = async (
  email: string,
  password: string,
  displayName: string,
): Promise<{ success: boolean; user?: BrainUser; error?: string }> => {
  try {
    updateState({ status: "connecting" });

    const response = await brainApi.register(email, password, displayName);

    if (response.success && response.data) {
      const credentials: BrainCredentials = {
        accessToken: response.data.access_token,
        refreshToken: response.data.refresh_token,
        expiresAt: response.data.expires_at,
        user: response.data.user,
      };

      await saveCredentials(credentials);

      updateState({
        status: "connected",
        user: response.data.user,
        lastError: null,
      });

      return { success: true, user: response.data.user };
    }

    updateState({ status: "error", lastError: "Registration failed" });
    return { success: false, error: "Registration failed" };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    updateState({ status: "error", lastError: errorMessage });
    return { success: false, error: errorMessage };
  }
};

/**
 * Logout from Brain service
 */
export const logout = async (): Promise<void> => {
  try {
    const credentials = await loadCredentials();
    if (credentials?.refreshToken) {
      await brainApi.logout(credentials.refreshToken);
    }
  } catch {
    // Ignore logout errors
  } finally {
    await clearCredentials();
    updateState({
      status: "disconnected",
      user: null,
      knowledgeCount: 0,
      memoryCount: 0,
    });
  }
};

// ============================================================================
// Connection Management
// ============================================================================

/**
 * Get authentication token (API key or JWT token)
 */
export const getAuthToken = async (): Promise<string | undefined> => {
  const apiKey = await getApiKey();
  if (apiKey) {
    return apiKey;
  }
  return getJwtToken();
};

/**
 * Check if Brain service is available and connect
 */
export const connect = async (): Promise<boolean> => {
  // Skip connection when Brain is disabled
  if (BRAIN_DISABLED) {
    return false;
  }

  try {
    updateState({ status: "connecting" });

    // First check if service is healthy
    await brainApi.checkHealth();

    // Then check if we have valid credentials (API key or JWT token)
    const authToken = await getAuthToken();
    if (!authToken) {
      updateState({ status: "disconnected", lastError: null });
      return false;
    }

    // Try to get stats to verify credentials are valid
    const projectId = brainState.projectId ?? BRAIN_DEFAULTS.PROJECT_ID;
    const statsResponse = await brainApi.getKnowledgeStats(projectId, authToken);

    if (statsResponse.success && statsResponse.data) {
      updateState({
        status: "connected",
        knowledgeCount: statsResponse.data.total_concepts,
        lastError: null,
      });

      // Also try to get memory stats
      try {
        const memoryStats = await brainApi.getMemoryStats(authToken);
        updateState({ memoryCount: memoryStats.totalNodes });
      } catch {
        // Memory stats are optional
      }

      return true;
    }

    updateState({ status: "error", lastError: BRAIN_ERRORS.INVALID_API_KEY });
    return false;
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : BRAIN_ERRORS.CONNECTION_FAILED;
    updateState({ status: "error", lastError: errorMessage });
    return false;
  }
};

/**
 * Disconnect from Brain service
 */
export const disconnect = (): void => {
  updateState({
    status: "disconnected",
    knowledgeCount: 0,
    memoryCount: 0,
    lastError: null,
  });
};

/**
 * Check if connected to Brain
 */
export const isConnected = (): boolean => {
  if (BRAIN_DISABLED) return false;
  return brainState.status === "connected";
};

// ============================================================================
// Knowledge Operations
// ============================================================================

/**
 * Recall relevant knowledge for a query
 */
export const recall = async (
  query: string,
  limit = 5,
): Promise<BrainRecallResponse | null> => {
  if (!isConnected()) {
    return null;
  }

  try {
    const apiKey = await getApiKey();
    if (!apiKey) {
      return null;
    }

    const response = await brainApi.recallKnowledge(
      {
        query,
        project_id: brainState.projectId ?? BRAIN_DEFAULTS.PROJECT_ID,
        limit,
      },
      apiKey,
    );

    return response;
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : BRAIN_ERRORS.RECALL_FAILED;
    updateState({ lastError: errorMessage });
    return null;
  }
};

/**
 * Get context string for prompt injection
 */
export const getContext = async (
  query: string,
  maxConcepts = 3,
): Promise<string | null> => {
  if (!isConnected()) {
    return null;
  }

  try {
    const apiKey = await getApiKey();
    if (!apiKey) {
      return null;
    }

    const response = await brainApi.buildContext(
      {
        query,
        project_id: brainState.projectId ?? BRAIN_DEFAULTS.PROJECT_ID,
        max_concepts: maxConcepts,
      },
      apiKey,
    );

    if (response.success && response.data.has_knowledge) {
      return response.data.context;
    }

    return null;
  } catch {
    return null;
  }
};

/**
 * Learn a concept
 */
export const learn = async (
  name: string,
  whatItDoes: string,
  options?: {
    howItWorks?: string;
    patterns?: string[];
    files?: string[];
    keyFunctions?: string[];
    aliases?: string[];
  },
): Promise<BrainConcept | null> => {
  if (!isConnected()) {
    return null;
  }

  try {
    const apiKey = await getApiKey();
    if (!apiKey) {
      return null;
    }

    const response = await brainApi.learnConcept(
      {
        project_id: brainState.projectId ?? BRAIN_DEFAULTS.PROJECT_ID,
        name,
        what_it_does: whatItDoes,
        how_it_works: options?.howItWorks,
        patterns: options?.patterns,
        files: options?.files,
        key_functions: options?.keyFunctions,
        aliases: options?.aliases,
      },
      apiKey,
    );

    if (response.success && response.data) {
      // Update knowledge count
      updateState({ knowledgeCount: brainState.knowledgeCount + 1 });
      return response.data;
    }

    return null;
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : BRAIN_ERRORS.LEARN_FAILED;
    updateState({ lastError: errorMessage });
    return null;
  }
};

/**
 * Extract and learn concepts from content
 */
export const extractAndLearn = async (
  content: string,
  source = "conversation",
): Promise<BrainExtractResponse | null> => {
  if (!isConnected()) {
    return null;
  }

  try {
    const apiKey = await getApiKey();
    if (!apiKey) {
      return null;
    }

    const response = await brainApi.extractConcepts(
      {
        content,
        project_id: brainState.projectId ?? BRAIN_DEFAULTS.PROJECT_ID,
        source,
      },
      apiKey,
    );

    if (response.success) {
      // Update knowledge count
      const newCount =
        brainState.knowledgeCount + response.data.stored + response.data.updated;
      updateState({ knowledgeCount: newCount });
      return response;
    }

    return null;
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : BRAIN_ERRORS.EXTRACT_FAILED;
    updateState({ lastError: errorMessage });
    return null;
  }
};

// ============================================================================
// Memory Operations
// ============================================================================

/**
 * Search memories
 */
export const searchMemories = async (
  query: string,
  limit = 10,
): Promise<{ memories: Array<{ content: string; similarity: number }> } | null> => {
  if (!isConnected()) {
    return null;
  }

  try {
    const apiKey = await getApiKey();
    if (!apiKey) {
      return null;
    }

    const response = await brainApi.searchMemories(
      {
        query,
        limit,
        project_id: brainState.projectId ?? BRAIN_DEFAULTS.PROJECT_ID,
      },
      apiKey,
    );

    return {
      memories: response.memories.map((m) => ({
        content: m.content,
        similarity: m.similarity ?? 0,
      })),
    };
  } catch {
    return null;
  }
};

/**
 * Store a memory
 */
export const storeMemory = async (
  content: string,
  type: "fact" | "pattern" | "correction" | "preference" | "context" = "context",
): Promise<boolean> => {
  if (!isConnected()) {
    return false;
  }

  try {
    const apiKey = await getApiKey();
    if (!apiKey) {
      return false;
    }

    const response = await brainApi.storeMemory(
      {
        content,
        type,
        project_id: brainState.projectId ?? BRAIN_DEFAULTS.PROJECT_ID,
      },
      apiKey,
    );

    if (response.success) {
      updateState({ memoryCount: brainState.memoryCount + 1 });
      return true;
    }

    return false;
  } catch {
    return false;
  }
};

// ============================================================================
// State Accessors
// ============================================================================

/**
 * Get current brain state
 */
export const getState = (): BrainState => {
  return { ...brainState };
};

/**
 * Update brain state
 */
const updateState = (updates: Partial<BrainState>): void => {
  brainState = { ...brainState, ...updates };
};

/**
 * Set project ID
 */
export const setProjectId = (projectId: number): void => {
  updateState({ projectId });
};

/**
 * Get connection status
 */
export const getStatus = (): BrainConnectionStatus => {
  return brainState.status;
};

/**
 * Check if authenticated (has API key or JWT token)
 */
export const isAuthenticated = async (): Promise<boolean> => {
  const apiKey = await getApiKey();
  const jwtToken = await getJwtToken();
  return apiKey !== undefined || jwtToken !== undefined;
};

// ============================================================================
// Initialization
// ============================================================================

/**
 * Initialize brain service (auto-connect if credentials available)
 */
export const initialize = async (): Promise<boolean> => {
  const hasAuth = await isAuthenticated();
  if (hasAuth) {
    return connect();
  }
  return false;
};
