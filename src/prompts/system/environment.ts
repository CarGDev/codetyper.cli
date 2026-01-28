/**
 * Environment Prompt Template
 *
 * Template for dynamic environment context injection.
 * Use placeholders: {{workingDirectory}}, {{isGitRepo}}, {{platform}}, {{osVersion}}, {{date}}
 */

export const ENVIRONMENT_PROMPT_TEMPLATE = `
## Environment

<env>
Working directory: {{workingDirectory}}
Is directory a git repo: {{isGitRepo}}
Platform: {{platform}}
OS Version: {{osVersion}}
Today's date: {{date}}
</env>`;
