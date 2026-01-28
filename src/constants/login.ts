/**
 * Login flow constants and messages
 */

export const LOGIN_MESSAGES = {
  COPILOT_ALREADY_CONFIGURED: "✓ Copilot is already configured and working!",
  COPILOT_STARTING_AUTH: "\nStarting GitHub device flow authentication...\n",
  COPILOT_AUTH_INSTRUCTIONS: "To authenticate with GitHub Copilot:\n",
  COPILOT_WAITING: "Waiting for authentication (press Ctrl+C to cancel)...\n",
  COPILOT_SUCCESS: "\n✓ GitHub Copilot authenticated successfully!",
  OLLAMA_SUCCESS: "\n✓ Connected to Ollama!",
  OLLAMA_NO_MODELS: "\nNo models found. Pull a model with: ollama pull <model>",
  AVAILABLE_MODELS: "\nAvailable models:",
  VALIDATION_FAILED: "\n✗ Validation failed:",
  AUTH_FAILED: "\n✗ Authentication failed:",
  CONNECTION_FAILED: "\n✗ Failed to connect:",
  UNKNOWN_PROVIDER: "Unknown provider:",
} as const;

export const LOGIN_PROMPTS = {
  RECONFIGURE: "Do you want to re-authenticate?",
  OLLAMA_HOST: "Ollama host URL:",
} as const;

export const AUTH_STEP_PREFIXES = {
  OPEN_URL: "  1. Open:",
  ENTER_CODE: "  2. Enter code:",
} as const;
