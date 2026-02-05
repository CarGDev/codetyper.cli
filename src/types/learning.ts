export type LearningCategory =
  | "preference"
  | "convention"
  | "architecture"
  | "style"
  | "testing"
  | "workflow"
  | "general";

export interface LearningCandidate {
  content: string;
  context: string;
  confidence: number;
  category: LearningCategory;
}

export interface StoredLearning {
  id: string;
  content: string;
  context?: string;
  createdAt: number;
}

export type MessageSource = "user" | "assistant";

export interface LearningPatternMatch {
  pattern: RegExp;
  match: RegExpMatchArray;
}
