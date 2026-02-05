/**
 * Classify command handler
 */

import chalk from "chalk";
import {
  succeedSpinner,
  startSpinner,
  errorMessage,
  failSpinner,
  headerMessage,
} from "@utils/core/terminal";
import {
  INTENT_KEYWORDS,
  CLASSIFICATION_CONFIDENCE,
} from "@constants/handlers";
import type {
  CommandOptions,
  IntentRequest,
  IntentResponse,
} from "@/types/common";

const classifyIntent = async (
  request: IntentRequest,
): Promise<IntentResponse> => {
  await new Promise((resolve) => setTimeout(resolve, 1000));

  const prompt = request.prompt.toLowerCase();
  let intent: IntentResponse["intent"] = "ask";
  let confidence: number = CLASSIFICATION_CONFIDENCE.DEFAULT;

  const intentMatchers: Record<string, () => void> = {
    fix: () => {
      intent = "fix";
      confidence = CLASSIFICATION_CONFIDENCE.HIGH;
    },
    test: () => {
      intent = "test";
      confidence = CLASSIFICATION_CONFIDENCE.MEDIUM;
    },
    refactor: () => {
      intent = "refactor";
      confidence = CLASSIFICATION_CONFIDENCE.LOW;
    },
    code: () => {
      intent = "code";
      confidence = CLASSIFICATION_CONFIDENCE.DEFAULT;
    },
    document: () => {
      intent = "document";
      confidence = CLASSIFICATION_CONFIDENCE.HIGH;
    },
  };

  for (const [intentKey, keywords] of Object.entries(INTENT_KEYWORDS)) {
    const hasMatch = keywords.some((keyword) => prompt.includes(keyword));
    if (hasMatch) {
      intentMatchers[intentKey]?.();
      break;
    }
  }

  return {
    intent,
    confidence,
    reasoning: `Based on keywords in the prompt, this appears to be a ${intent} request.`,
    needsClarification: confidence < CLASSIFICATION_CONFIDENCE.THRESHOLD,
    clarificationQuestions:
      confidence < CLASSIFICATION_CONFIDENCE.THRESHOLD
        ? [
            "Which specific files should I focus on?",
            "What is the expected outcome?",
          ]
        : undefined,
  };
};

export const handleClassify = async (
  options: CommandOptions,
): Promise<void> => {
  const { prompt, context, files = [] } = options;

  if (!prompt) {
    errorMessage("Prompt is required");
    return;
  }

  headerMessage("Classifying Intent");
  console.log(chalk.bold("Prompt:") + ` ${prompt}`);
  if (context) {
    console.log(chalk.bold("Context:") + ` ${context}`);
  }
  if (files.length > 0) {
    console.log(chalk.bold("Files:") + ` ${files.join(", ")}`);
  }
  console.log();

  startSpinner("Analyzing prompt...");

  try {
    const result = await classifyIntent({ prompt, context, files });
    succeedSpinner("Analysis complete");

    console.log();
    console.log(chalk.bold("Intent:") + ` ${chalk.cyan(result.intent)}`);
    console.log(
      chalk.bold("Confidence:") +
        ` ${chalk.green((result.confidence * 100).toFixed(1) + "%")}`,
    );
    console.log(chalk.bold("Reasoning:") + ` ${result.reasoning}`);

    if (result.needsClarification && result.clarificationQuestions) {
      console.log();
      console.log(chalk.yellow.bold("Clarification needed:"));
      result.clarificationQuestions.forEach((q, i) => {
        console.log(`  ${i + 1}. ${q}`);
      });
    }
  } catch (error) {
    failSpinner("Classification failed");
    throw error;
  }
};
