/**
 * Embedding Service
 *
 * Generates text embeddings using Ollama for semantic search
 */

import got from "got";

import {
  EMBEDDING_DEFAULTS,
  EMBEDDING_ENDPOINTS,
  EMBEDDING_TIMEOUTS,
} from "@constants/embeddings";
import { getOllamaBaseUrl } from "@providers/ollama/state";

import type {
  EmbeddingVector,
  EmbeddingResult,
  EmbeddingError,
  EmbeddingServiceState,
  OllamaEmbedRequest,
  OllamaEmbedResponse,
} from "@/types/embeddings";

// =============================================================================
// Service State
// =============================================================================

let serviceState: EmbeddingServiceState = {
  initialized: false,
  model: null,
  available: false,
  error: null,
};

// =============================================================================
// Ollama API
// =============================================================================

const callOllamaEmbed = async (
  texts: string[],
  model: string,
): Promise<EmbeddingVector[]> => {
  const baseUrl = getOllamaBaseUrl();
  const endpoint = `${baseUrl}${EMBEDDING_ENDPOINTS.EMBED}`;

  const request: OllamaEmbedRequest = {
    model,
    input: texts,
  };

  const response = await got
    .post(endpoint, {
      json: request,
      timeout: { request: EMBEDDING_TIMEOUTS.EMBED },
    })
    .json<OllamaEmbedResponse>();

  return response.embeddings;
};

// =============================================================================
// Model Detection
// =============================================================================

const checkModelAvailable = async (model: string): Promise<boolean> => {
  try {
    // Try to embed a simple test string
    await callOllamaEmbed(["test"], model);
    return true;
  } catch {
    return false;
  }
};

const findAvailableModel = async (): Promise<string | null> => {
  const modelsToTry = [
    EMBEDDING_DEFAULTS.MODEL,
    EMBEDDING_DEFAULTS.FALLBACK_MODEL,
    "mxbai-embed-large",
    "snowflake-arctic-embed",
  ];

  for (const model of modelsToTry) {
    const available = await checkModelAvailable(model);
    if (available) {
      return model;
    }
  }

  return null;
};

// =============================================================================
// Service Initialization
// =============================================================================

export const initializeEmbeddingService =
  async (): Promise<EmbeddingServiceState> => {
    if (serviceState.initialized) {
      return serviceState;
    }

    try {
      const model = await findAvailableModel();

      if (model) {
        serviceState = {
          initialized: true,
          model,
          available: true,
          error: null,
        };
      } else {
        serviceState = {
          initialized: true,
          model: null,
          available: false,
          error: {
            code: "MODEL_NOT_FOUND",
            message: `No embedding model found. Install one with: ollama pull ${EMBEDDING_DEFAULTS.MODEL}`,
          },
        };
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const isConnectionError =
        message.includes("ECONNREFUSED") || message.includes("connect");

      serviceState = {
        initialized: true,
        model: null,
        available: false,
        error: {
          code: isConnectionError ? "OLLAMA_NOT_RUNNING" : "EMBEDDING_FAILED",
          message: isConnectionError
            ? "Ollama is not running. Start it with: ollama serve"
            : `Embedding service error: ${message}`,
        },
      };
    }

    return serviceState;
  };

// =============================================================================
// Core Embedding Functions
// =============================================================================

/**
 * Generate embedding for a single text
 */
export const embed = async (text: string): Promise<EmbeddingResult | null> => {
  if (!serviceState.initialized) {
    await initializeEmbeddingService();
  }

  if (!serviceState.available || !serviceState.model) {
    return null;
  }

  try {
    const embeddings = await callOllamaEmbed([text], serviceState.model);

    if (embeddings.length === 0) {
      return null;
    }

    return {
      text,
      embedding: embeddings[0],
      model: serviceState.model,
      dimensions: embeddings[0].length,
    };
  } catch {
    return null;
  }
};

/**
 * Generate embeddings for multiple texts (batch)
 */
export const embedBatch = async (
  texts: string[],
): Promise<(EmbeddingResult | null)[]> => {
  if (!serviceState.initialized) {
    await initializeEmbeddingService();
  }

  if (!serviceState.available || !serviceState.model) {
    return texts.map(() => null);
  }

  try {
    const embeddings = await callOllamaEmbed(texts, serviceState.model);

    return texts.map((text, i) => {
      const embedding = embeddings[i];
      if (!embedding) {
        return null;
      }

      return {
        text,
        embedding,
        model: serviceState.model!,
        dimensions: embedding.length,
      };
    });
  } catch {
    return texts.map(() => null);
  }
};

// =============================================================================
// Service State Accessors
// =============================================================================

export const isEmbeddingAvailable = (): boolean => serviceState.available;

export const getEmbeddingModel = (): string | null => serviceState.model;

export const getEmbeddingError = (): EmbeddingError | null =>
  serviceState.error;

export const getServiceState = (): EmbeddingServiceState => ({
  ...serviceState,
});

/**
 * Reset service state (for testing)
 */
export const resetEmbeddingService = (): void => {
  serviceState = {
    initialized: false,
    model: null,
    available: false,
    error: null,
  };
};
