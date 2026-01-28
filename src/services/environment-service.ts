/**
 * Environment Service
 *
 * Provides environment context for system prompts.
 */

import { platform, release } from "os";
import { existsSync } from "fs";
import { join } from "path";

import { ENVIRONMENT_PROMPT_TEMPLATE } from "@prompts/system/environment";

export interface EnvironmentContext {
  workingDirectory: string;
  isGitRepo: boolean;
  platform: string;
  osVersion: string;
  date: string;
  model?: string;
  provider?: string;
}

const isGitRepository = (dir: string): boolean => {
  return existsSync(join(dir, ".git"));
};

const formatDate = (): string => {
  return new Date().toISOString().split("T")[0];
};

const getPlatformName = (): string => {
  const platformMap: Record<string, string> = {
    darwin: "macOS",
    linux: "Linux",
    win32: "Windows",
  };
  return platformMap[platform()] || platform();
};

export const getEnvironmentContext = (
  workingDirectory: string,
): EnvironmentContext => ({
  workingDirectory,
  isGitRepo: isGitRepository(workingDirectory),
  platform: getPlatformName(),
  osVersion: release(),
  date: formatDate(),
});

export const buildEnvironmentPrompt = (
  ctx: EnvironmentContext,
  model?: string,
  provider?: string,
): string => {
  let prompt = ENVIRONMENT_PROMPT_TEMPLATE.replace(
    "{{workingDirectory}}",
    ctx.workingDirectory,
  )
    .replace("{{isGitRepo}}", ctx.isGitRepo ? "Yes" : "No")
    .replace("{{platform}}", ctx.platform)
    .replace("{{osVersion}}", ctx.osVersion)
    .replace("{{date}}", ctx.date);

  if (model && provider) {
    prompt += `\n\nYou are powered by ${provider}/${model}.`;
  }

  return prompt;
};
