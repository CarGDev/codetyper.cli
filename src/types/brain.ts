/**
 * Brain API Type Definitions
 *
 * Types for the CodeTyper Brain service - a knowledge graph API
 * that provides long-term memory and context for the CLI
 */

// ============================================================================
// Authentication Types
// ============================================================================

export interface BrainUser {
  id: number;
  email: string;
  display_name: string;
}

export interface BrainLoginResponse {
  success: boolean;
  data: {
    user: BrainUser;
    access_token: string;
    refresh_token: string;
    expires_at: string;
  };
}

export interface BrainRegisterResponse {
  success: boolean;
  data: {
    user: BrainUser;
    access_token: string;
    refresh_token: string;
    expires_at: string;
  };
}

export interface BrainCredentials {
  apiKey?: string;
  accessToken?: string;
  refreshToken?: string;
  expiresAt?: string;
  user?: BrainUser;
}

// ============================================================================
// Knowledge Graph Types
// ============================================================================

export interface BrainConcept {
  id: number;
  name: string;
  what_it_does: string;
  how_it_works?: string;
  patterns?: string[];
  files?: string[];
  key_functions?: string[];
  aliases?: string[];
  importance: number;
  similarity?: number;
  related_concepts?: BrainRelatedConcept[];
}

export interface BrainRelatedConcept {
  id: number;
  name: string;
  relation_type: BrainRelationType;
  strength: number;
}

export type BrainRelationType =
  | "depends_on"
  | "uses"
  | "extends"
  | "similar_to"
  | "part_of"
  | "implements"
  | "contradicts";

export interface BrainLearnConceptRequest {
  project_id: number;
  name: string;
  what_it_does: string;
  how_it_works?: string;
  patterns?: string[];
  files?: string[];
  key_functions?: string[];
  aliases?: string[];
  metadata?: Record<string, unknown>;
}

export interface BrainRecallRequest {
  query: string;
  project_id: number;
  limit?: number;
}

export interface BrainRecallResponse {
  success: boolean;
  data: {
    concepts: BrainConcept[];
    keywords_matched: string[];
    suggested_context: string;
  };
}

export interface BrainContextRequest {
  query: string;
  project_id: number;
  max_concepts?: number;
}

export interface BrainContextResponse {
  success: boolean;
  data: {
    context: string;
    has_knowledge: boolean;
  };
}

export interface BrainExtractRequest {
  content: string;
  project_id: number;
  source?: string;
}

export interface BrainExtractResponse {
  success: boolean;
  data: {
    extracted: Array<{
      name: string;
      what_it_does: string;
      confidence: number;
    }>;
    stored: number;
    updated: number;
    skipped: number;
  };
}

// ============================================================================
// Memory Types
// ============================================================================

export type BrainMemoryType =
  | "fact"
  | "pattern"
  | "correction"
  | "preference"
  | "context";

export interface BrainMemory {
  id: number;
  content: string;
  similarity?: number;
  node_type: BrainMemoryType;
  importance: number;
}

export interface BrainMemorySearchRequest {
  query: string;
  limit?: number;
  threshold?: number;
  project_id?: number;
}

export interface BrainMemorySearchResponse {
  memories: BrainMemory[];
  count: number;
}

export interface BrainStoreMemoryRequest {
  content: string;
  type?: BrainMemoryType;
  project_id?: number;
}

// ============================================================================
// Stats Types
// ============================================================================

export interface BrainKnowledgeStats {
  total_concepts: number;
  total_relations: number;
  total_keywords: number;
  by_pattern: Record<string, number>;
  top_concepts: Array<{
    name: string;
    access_count: number;
    importance: number;
  }>;
}

export interface BrainMemoryStats {
  totalNodes: number;
  totalEdges: number;
  byType: Record<BrainMemoryType, number>;
}

// ============================================================================
// Connection Status Types
// ============================================================================

export type BrainConnectionStatus =
  | "disconnected"
  | "connecting"
  | "connected"
  | "error";

export interface BrainState {
  status: BrainConnectionStatus;
  user: BrainUser | null;
  projectId: number | null;
  knowledgeCount: number;
  memoryCount: number;
  lastError: string | null;
}

// ============================================================================
// API Response Types
// ============================================================================

export interface BrainApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface BrainHealthResponse {
  status: string;
  version: string;
}
