/**
 * Services Core - Core service exports
 */

// Agent
export {
  runAgentLoop,
  runAgent,
  createAgent,
  type AgentOptions,
  type AgentResult,
} from "./agent";

// Permissions
export {
  setWorkingDir as setPermissionsWorkingDir,
  setPermissionHandler,
  initializePermissions,
  parsePattern,
  matchesBashPattern,
  matchesPathPattern,
  isBashAllowed,
  isBashDenied,
  isFileOpAllowed,
  generateBashPattern,
  addSessionPattern,
  addGlobalPattern,
  addLocalPattern,
  listPatterns,
  clearSessionPatterns,
  promptBashPermission,
  promptFilePermission,
  promptPermission,
  getPermissionLevel,
  type ToolType,
  type PermissionPattern,
  type PermissionsConfig,
  type PermissionHandler,
} from "./permissions";

// Session
export {
  createSession,
  loadSession,
  saveSession,
  addMessage,
  addContextFile,
  removeContextFile,
  getCurrentSession,
  listSessions,
  deleteSession,
  clearMessages,
  getMostRecentSession,
  getSessionSummaries,
  findSession,
  setWorkingDirectory,
  type SessionInfo,
} from "./session";

// Executor
export {
  setWorkingDir as setExecutorWorkingDir,
  getWorkingDir,
  executeCommand,
  executeStreamingCommand,
  readFile,
  writeFile,
  editFile,
  deleteFile,
  createDirectory,
  listDirectory,
  pathExists,
  getStats,
  type ExecutionResult,
  type FileOperation,
} from "./executor";

// Config
export {
  loadConfig,
  saveConfig,
  getConfigValue,
  setConfigValue,
  getAllConfig,
  getApiKey,
  getModel,
  getConfigPath,
  isProtectedPath,
  resetConfig,
  getConfig,
} from "./config";
