/**
 * Quality Evaluation Layer
 * Assesses LLM response acceptability using structural and lexical signals
 */

import type {
  QualityEvalInput,
  QualityEvalOutput,
  QualityMetrics,
  QualityVerdict,
  DeficiencyTag,
  Entity,
  ResponseType,
} from "@/types/reasoning";

import {
  QUALITY_THRESHOLDS,
  QUALITY_WEIGHTS,
  STRUCTURAL_CHECK_WEIGHTS,
  HALLUCINATION_PATTERNS,
  CONTRADICTION_PATTERNS,
  INCOMPLETE_STATEMENT_PATTERNS,
} from "@constants/reasoning";

import {
  tokenize,
  jaccardSimilarity,
  weightedSum,
  hasBalancedBraces,
  extractCodeBlocks,
  countMatches,
} from "@services/reasoning/utils";

// =============================================================================
// MAIN EVALUATION FUNCTION
// =============================================================================

export function evaluateQuality(input: QualityEvalInput): QualityEvalOutput {
  const metrics = computeQualityMetrics(input);
  const score = computeFinalScore(metrics);
  const verdict = computeVerdict(score);
  const deficiencies = detectDeficiencies(input, metrics);

  return {
    score,
    verdict,
    deficiencies,
    metrics,
  };
}

// =============================================================================
// METRICS COMPUTATION
// =============================================================================

function computeQualityMetrics(input: QualityEvalInput): QualityMetrics {
  return {
    structural: computeStructuralScore(input),
    relevance: computeRelevanceScore(input),
    completeness: computeCompletenessScore(input),
    coherence: computeCoherenceScore(input),
  };
}

function computeFinalScore(metrics: QualityMetrics): number {
  const values = [
    metrics.structural,
    metrics.relevance,
    metrics.completeness,
    metrics.coherence,
  ];
  const weights = [
    QUALITY_WEIGHTS.structural,
    QUALITY_WEIGHTS.relevance,
    QUALITY_WEIGHTS.completeness,
    QUALITY_WEIGHTS.coherence,
  ];
  return weightedSum(values, weights);
}

// =============================================================================
// STRUCTURAL SCORE
// =============================================================================

function computeStructuralScore(input: QualityEvalInput): number {
  const checks = [
    parseSucceeds(input),
    hasExpectedFormat(input),
    withinLengthBounds(input),
    noMalformedBlocks(input),
  ];

  const weights = [
    STRUCTURAL_CHECK_WEIGHTS.parseSucceeds,
    STRUCTURAL_CHECK_WEIGHTS.hasExpectedFormat,
    STRUCTURAL_CHECK_WEIGHTS.withinLengthBounds,
    STRUCTURAL_CHECK_WEIGHTS.noMalformedBlocks,
  ];

  return weightedSum(
    checks.map((b) => (b ? 1 : 0)),
    weights,
  );
}

function parseSucceeds(input: QualityEvalInput): boolean {
  const { responseText, responseToolCalls } = input;

  if (responseText.length === 0 && responseToolCalls.length === 0) {
    return false;
  }

  for (const toolCall of responseToolCalls) {
    if (!toolCall.name || typeof toolCall.arguments !== "object") {
      return false;
    }
  }

  return true;
}

function hasExpectedFormat(input: QualityEvalInput): boolean {
  const { responseText, responseToolCalls, expectedType } = input;

  const formatChecks: Record<ResponseType, () => boolean> = {
    tool_call: () => responseToolCalls.length > 0,
    text: () => responseText.length > 0 && responseToolCalls.length === 0,
    code: () => extractCodeBlocks(responseText).length > 0,
    mixed: () => true,
  };

  return formatChecks[expectedType]();
}

function withinLengthBounds(input: QualityEvalInput): boolean {
  const { responseText, taskConstraints } = input;
  const maxTokens = taskConstraints.maxResponseTokens || 4000;
  const estimatedTokens = responseText.length * 0.25;
  return estimatedTokens <= maxTokens;
}

function noMalformedBlocks(input: QualityEvalInput): boolean {
  const { responseText } = input;

  if (!hasBalancedBraces(responseText)) {
    return false;
  }

  const codeBlockCount = countMatches(responseText, /```/g);
  if (codeBlockCount % 2 !== 0) {
    return false;
  }

  return true;
}

// =============================================================================
// RELEVANCE SCORE
// =============================================================================

function computeRelevanceScore(input: QualityEvalInput): number {
  const { responseText, queryTokens, queryEntities } = input;

  const responseTokens = tokenize(responseText);
  const tokenOverlap = jaccardSimilarity(queryTokens, responseTokens);

  const entityHits = countEntityMentions(responseText, queryEntities);
  const entityRatio =
    queryEntities.length > 0 ? entityHits / queryEntities.length : 1;

  return tokenOverlap * 0.5 + entityRatio * 0.5;
}

function countEntityMentions(text: string, entities: Entity[]): number {
  const lowerText = text.toLowerCase();
  let hits = 0;

  for (const entity of entities) {
    if (lowerText.includes(entity.value.toLowerCase())) {
      hits++;
    }
  }

  return hits;
}

// =============================================================================
// COMPLETENESS SCORE
// =============================================================================

function computeCompletenessScore(input: QualityEvalInput): number {
  const { responseText, responseToolCalls, taskConstraints } = input;
  const { requiredOutputs, expectedToolCalls, requiresCode, codeLanguage } =
    taskConstraints;

  const scores: number[] = [];

  if (requiredOutputs.length > 0) {
    const outputsPresent = requiredOutputs.filter((output) =>
      responseText.toLowerCase().includes(output.toLowerCase()),
    ).length;
    scores.push(outputsPresent / requiredOutputs.length);
  }

  if (expectedToolCalls.length > 0) {
    const toolCallsPresent = expectedToolCalls.filter((toolName) =>
      responseToolCalls.some((tc) => tc.name === toolName),
    ).length;
    scores.push(toolCallsPresent / expectedToolCalls.length);
  }

  if (requiresCode) {
    const codeBlocks = extractCodeBlocks(responseText);
    const hasCode = codeBlocks.length > 0;
    const hasCorrectLanguage =
      !codeLanguage ||
      codeBlocks.some(
        (b) => b.language.toLowerCase() === codeLanguage.toLowerCase(),
      );
    scores.push(hasCode && hasCorrectLanguage ? 1 : 0);
  }

  if (scores.length === 0) {
    return responseText.length > 50 ? 1 : 0.5;
  }

  return scores.reduce((a, b) => a + b, 0) / scores.length;
}

// =============================================================================
// COHERENCE SCORE
// =============================================================================

function computeCoherenceScore(input: QualityEvalInput): number {
  const { responseText } = input;

  const penalties: number[] = [];

  if (hasHallucinationMarkers(responseText)) {
    penalties.push(0.4);
  }

  if (hasContradiction(responseText)) {
    penalties.push(0.3);
  }

  if (hasIncompleteStatement(responseText)) {
    penalties.push(0.2);
  }

  if (hasBrokenReference(responseText)) {
    penalties.push(0.1);
  }

  const totalPenalty = penalties.reduce((a, b) => a + b, 0);
  return Math.max(0, 1 - totalPenalty);
}

function hasHallucinationMarkers(text: string): boolean {
  return HALLUCINATION_PATTERNS.some((pattern) => pattern.test(text));
}

function hasContradiction(text: string): boolean {
  return CONTRADICTION_PATTERNS.some((pattern) => pattern.test(text));
}

function hasIncompleteStatement(text: string): boolean {
  const trimmed = text.trim();
  return INCOMPLETE_STATEMENT_PATTERNS.some((pattern) => pattern.test(trimmed));
}

function hasBrokenReference(text: string): boolean {
  const referencePatterns = [
    /\[\d+\]/g,
    /see above/i,
    /as mentioned/i,
    /previously/i,
  ];

  const hasReference = referencePatterns.some((p) => p.test(text));
  if (!hasReference) return false;

  const bracketRefs = text.match(/\[(\d+)\]/g);
  if (bracketRefs) {
    const maxRef = Math.max(
      ...bracketRefs.map((r) => parseInt(r.slice(1, -1))),
    );
    const actualRefs = text.match(/^\[\d+\]:/gm);
    if (actualRefs && maxRef > actualRefs.length) {
      return true;
    }
  }

  return false;
}

// =============================================================================
// VERDICT COMPUTATION
// =============================================================================

function computeVerdict(score: number): QualityVerdict {
  if (score >= QUALITY_THRESHOLDS.ACCEPT) return "ACCEPT";
  if (score >= QUALITY_THRESHOLDS.RETRY) return "RETRY";
  if (score >= QUALITY_THRESHOLDS.ESCALATE) return "ESCALATE";
  return "ABORT";
}

// =============================================================================
// DEFICIENCY DETECTION
// =============================================================================

function detectDeficiencies(
  input: QualityEvalInput,
  metrics: QualityMetrics,
): DeficiencyTag[] {
  const deficiencies: DeficiencyTag[] = [];
  const { responseText, responseToolCalls, taskConstraints, expectedType } =
    input;

  if (!parseSucceeds(input)) {
    deficiencies.push("PARSE_FAILURE");
  }

  if (responseText.length === 0 && responseToolCalls.length === 0) {
    deficiencies.push("EMPTY_RESPONSE");
  }

  if (expectedType === "tool_call" && responseToolCalls.length === 0) {
    deficiencies.push("MISSING_TOOL_CALL");
  }

  if (metrics.relevance < 0.3) {
    deficiencies.push("QUERY_MISMATCH");
  }

  if (!withinLengthBounds(input)) {
    deficiencies.push("TRUNCATED");
  }

  if (hasHallucinationMarkers(responseText)) {
    deficiencies.push("HALLUCINATION_MARKER");
  }

  if (hasContradiction(responseText)) {
    deficiencies.push("SELF_CONTRADICTION");
  }

  if (taskConstraints.requiresCode) {
    const codeBlocks = extractCodeBlocks(responseText);
    if (codeBlocks.length === 0) {
      deficiencies.push("INCOMPLETE_CODE");
    } else if (taskConstraints.codeLanguage) {
      const hasCorrectLang = codeBlocks.some(
        (b) =>
          b.language.toLowerCase() ===
          taskConstraints.codeLanguage!.toLowerCase(),
      );
      if (!hasCorrectLang) {
        deficiencies.push("WRONG_LANGUAGE");
      }
    }
  }

  if (taskConstraints.requiredOutputs.length > 0) {
    const missing = taskConstraints.requiredOutputs.filter(
      (o) => !responseText.toLowerCase().includes(o.toLowerCase()),
    );
    if (missing.length > 0) {
      deficiencies.push("MISSING_REQUIRED_OUTPUT");
    }
  }

  for (const toolCall of responseToolCalls) {
    if (!toolCall.id || !toolCall.name) {
      deficiencies.push("MALFORMED_TOOL_CALL");
      break;
    }
  }

  return [...new Set(deficiencies)];
}

// =============================================================================
// EXPORTS
// =============================================================================

export {
  computeQualityMetrics,
  computeStructuralScore,
  computeRelevanceScore,
  computeCompletenessScore,
  computeCoherenceScore,
  computeVerdict,
  detectDeficiencies,
  hasHallucinationMarkers,
  hasContradiction,
};
