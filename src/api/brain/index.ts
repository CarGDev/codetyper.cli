/**
 * Brain API Layer
 *
 * Low-level HTTP API calls to the CodeTyper Brain service
 */

import got from "got";
import {
  BRAIN_DEFAULTS,
  BRAIN_ENDPOINTS,
  BRAIN_TIMEOUTS,
  BRAIN_HEADERS,
} from "@constants/brain";
import type {
  BrainHealthResponse,
  BrainLoginResponse,
  BrainRegisterResponse,
  BrainRecallRequest,
  BrainRecallResponse,
  BrainLearnConceptRequest,
  BrainApiResponse,
  BrainConcept,
  BrainContextRequest,
  BrainContextResponse,
  BrainExtractRequest,
  BrainExtractResponse,
  BrainMemorySearchRequest,
  BrainMemorySearchResponse,
  BrainStoreMemoryRequest,
  BrainKnowledgeStats,
  BrainMemoryStats,
  BrainUser,
} from "@/types/brain";

/**
 * Build request headers with API key
 */
const buildHeaders = (
  apiKey?: string,
  accessToken?: string,
): Record<string, string> => ({
  [BRAIN_HEADERS.CONTENT_TYPE]: "application/json",
  ...(apiKey ? { [BRAIN_HEADERS.API_KEY]: apiKey } : {}),
  ...(accessToken
    ? { [BRAIN_HEADERS.AUTHORIZATION]: `Bearer ${accessToken}` }
    : {}),
});

/**
 * Get base URL for Brain API
 */
const getBaseUrl = (customUrl?: string): string => {
  return customUrl ?? BRAIN_DEFAULTS.BASE_URL;
};

// ============================================================================
// Health Check
// ============================================================================

/**
 * Check if Brain service is healthy
 */
export const checkHealth = async (
  baseUrl?: string,
): Promise<BrainHealthResponse> => {
  const url = `${getBaseUrl(baseUrl)}${BRAIN_ENDPOINTS.HEALTH}`;
  const response = await got
    .get(url, {
      timeout: { request: BRAIN_TIMEOUTS.HEALTH },
    })
    .json<BrainHealthResponse>();

  return response;
};

// ============================================================================
// Authentication
// ============================================================================

/**
 * Register a new user
 */
export const register = async (
  email: string,
  password: string,
  displayName: string,
  baseUrl?: string,
): Promise<BrainRegisterResponse> => {
  const url = `${getBaseUrl(baseUrl)}${BRAIN_ENDPOINTS.AUTH_REGISTER}`;
  const response = await got
    .post(url, {
      json: { email, password, display_name: displayName },
      timeout: { request: BRAIN_TIMEOUTS.AUTH },
    })
    .json<BrainRegisterResponse>();

  return response;
};

/**
 * Login with email and password
 */
export const login = async (
  email: string,
  password: string,
  baseUrl?: string,
): Promise<BrainLoginResponse> => {
  const url = `${getBaseUrl(baseUrl)}${BRAIN_ENDPOINTS.AUTH_LOGIN}`;
  const response = await got
    .post(url, {
      json: { email, password },
      timeout: { request: BRAIN_TIMEOUTS.AUTH },
    })
    .json<BrainLoginResponse>();

  return response;
};

/**
 * Logout (revoke refresh token)
 */
export const logout = async (
  refreshToken: string,
  baseUrl?: string,
): Promise<void> => {
  const url = `${getBaseUrl(baseUrl)}${BRAIN_ENDPOINTS.AUTH_LOGOUT}`;
  await got.post(url, {
    json: { refresh_token: refreshToken },
    timeout: { request: BRAIN_TIMEOUTS.AUTH },
  });
};

/**
 * Refresh access token
 */
export const refreshToken = async (
  refreshTokenValue: string,
  baseUrl?: string,
): Promise<BrainLoginResponse> => {
  const url = `${getBaseUrl(baseUrl)}${BRAIN_ENDPOINTS.AUTH_REFRESH}`;
  const response = await got
    .post(url, {
      json: { refresh_token: refreshTokenValue },
      timeout: { request: BRAIN_TIMEOUTS.AUTH },
    })
    .json<BrainLoginResponse>();

  return response;
};

/**
 * Get current authenticated user
 */
export const getCurrentUser = async (
  accessToken: string,
  baseUrl?: string,
): Promise<BrainApiResponse<BrainUser>> => {
  const url = `${getBaseUrl(baseUrl)}${BRAIN_ENDPOINTS.AUTH_ME}`;
  const response = await got
    .get(url, {
      ...{ headers: buildHeaders(undefined, accessToken) },
      timeout: { request: BRAIN_TIMEOUTS.AUTH },
    })
    .json<BrainApiResponse<BrainUser>>();

  return response;
};

// ============================================================================
// Knowledge Graph
// ============================================================================

/**
 * Recall relevant concepts from the knowledge graph
 */
export const recallKnowledge = async (
  request: BrainRecallRequest,
  apiKey: string,
  baseUrl?: string,
): Promise<BrainRecallResponse> => {
  const url = `${getBaseUrl(baseUrl)}${BRAIN_ENDPOINTS.KNOWLEDGE_RECALL}`;
  const response = await got
    .post(url, {
      ...{ headers: buildHeaders(apiKey) },
      json: request,
      timeout: { request: BRAIN_TIMEOUTS.KNOWLEDGE },
    })
    .json<BrainRecallResponse>();

  return response;
};

/**
 * Learn/store a concept in the knowledge graph
 */
export const learnConcept = async (
  request: BrainLearnConceptRequest,
  apiKey: string,
  baseUrl?: string,
): Promise<BrainApiResponse<BrainConcept>> => {
  const url = `${getBaseUrl(baseUrl)}${BRAIN_ENDPOINTS.KNOWLEDGE_LEARN}`;
  const response = await got
    .post(url, {
      ...{ headers: buildHeaders(apiKey) },
      json: request,
      timeout: { request: BRAIN_TIMEOUTS.KNOWLEDGE },
    })
    .json<BrainApiResponse<BrainConcept>>();

  return response;
};

/**
 * Build context string for prompt injection
 */
export const buildContext = async (
  request: BrainContextRequest,
  apiKey: string,
  baseUrl?: string,
): Promise<BrainContextResponse> => {
  const url = `${getBaseUrl(baseUrl)}${BRAIN_ENDPOINTS.KNOWLEDGE_CONTEXT}`;
  const response = await got
    .post(url, {
      ...{ headers: buildHeaders(apiKey) },
      json: request,
      timeout: { request: BRAIN_TIMEOUTS.KNOWLEDGE },
    })
    .json<BrainContextResponse>();

  return response;
};

/**
 * Extract concepts from text content
 */
export const extractConcepts = async (
  request: BrainExtractRequest,
  apiKey: string,
  baseUrl?: string,
): Promise<BrainExtractResponse> => {
  const url = `${getBaseUrl(baseUrl)}${BRAIN_ENDPOINTS.KNOWLEDGE_EXTRACT}`;
  const response = await got
    .post(url, {
      ...{ headers: buildHeaders(apiKey) },
      json: request,
      timeout: { request: BRAIN_TIMEOUTS.EXTRACT },
    })
    .json<BrainExtractResponse>();

  return response;
};

/**
 * Get knowledge stats for a project
 */
export const getKnowledgeStats = async (
  projectId: number,
  apiKey: string,
  baseUrl?: string,
): Promise<BrainApiResponse<BrainKnowledgeStats>> => {
  const url = `${getBaseUrl(baseUrl)}${BRAIN_ENDPOINTS.KNOWLEDGE_STATS}?project_id=${projectId}`;
  const response = await got
    .get(url, {
      ...{ headers: buildHeaders(apiKey) },
      timeout: { request: BRAIN_TIMEOUTS.KNOWLEDGE },
    })
    .json<BrainApiResponse<BrainKnowledgeStats>>();

  return response;
};

/**
 * List all concepts for a project
 */
export const listConcepts = async (
  projectId: number,
  apiKey: string,
  baseUrl?: string,
): Promise<BrainApiResponse<BrainConcept[]>> => {
  const url = `${getBaseUrl(baseUrl)}${BRAIN_ENDPOINTS.KNOWLEDGE_CONCEPTS}?project_id=${projectId}`;
  const response = await got
    .get(url, {
      ...{ headers: buildHeaders(apiKey) },
      timeout: { request: BRAIN_TIMEOUTS.KNOWLEDGE },
    })
    .json<BrainApiResponse<BrainConcept[]>>();

  return response;
};

// ============================================================================
// Memory
// ============================================================================

/**
 * Search for relevant memories
 */
export const searchMemories = async (
  request: BrainMemorySearchRequest,
  apiKey: string,
  baseUrl?: string,
): Promise<BrainMemorySearchResponse> => {
  const url = `${getBaseUrl(baseUrl)}${BRAIN_ENDPOINTS.MEMORY_SEARCH}`;
  const response = await got
    .post(url, {
      ...{ headers: buildHeaders(apiKey) },
      json: request,
      timeout: { request: BRAIN_TIMEOUTS.MEMORY },
    })
    .json<BrainMemorySearchResponse>();

  return response;
};

/**
 * Store a memory
 */
export const storeMemory = async (
  request: BrainStoreMemoryRequest,
  apiKey: string,
  baseUrl?: string,
): Promise<BrainApiResponse<{ id: number }>> => {
  const url = `${getBaseUrl(baseUrl)}${BRAIN_ENDPOINTS.MEMORY_STORE}`;
  const response = await got
    .post(url, {
      ...{ headers: buildHeaders(apiKey) },
      json: request,
      timeout: { request: BRAIN_TIMEOUTS.MEMORY },
    })
    .json<BrainApiResponse<{ id: number }>>();

  return response;
};

/**
 * Get memory stats
 */
export const getMemoryStats = async (
  apiKey: string,
  baseUrl?: string,
): Promise<BrainMemoryStats> => {
  const url = `${getBaseUrl(baseUrl)}${BRAIN_ENDPOINTS.MEMORY_STATS}`;
  const response = await got
    .get(url, {
      ...{ headers: buildHeaders(apiKey) },
      timeout: { request: BRAIN_TIMEOUTS.MEMORY },
    })
    .json<BrainMemoryStats>();

  return response;
};

/**
 * Check memory status
 */
export const checkMemoryStatus = async (
  baseUrl?: string,
): Promise<BrainApiResponse<{ available: boolean }>> => {
  const url = `${getBaseUrl(baseUrl)}${BRAIN_ENDPOINTS.MEMORY_STATUS}`;
  const response = await got
    .get(url, {
      timeout: { request: BRAIN_TIMEOUTS.MEMORY },
    })
    .json<BrainApiResponse<{ available: boolean }>>();

  return response;
};
