/**
 * Feature-Dev Workflow Constants
 *
 * Configuration and prompts for the 7-phase development workflow.
 */

import type { FeatureDevPhase, FeatureDevConfig } from "@/types/feature-dev";

/**
 * Default workflow configuration
 */
export const FEATURE_DEV_CONFIG: FeatureDevConfig = {
  requireCheckpoints: true,
  autoRunTests: true,
  autoCommit: false,
  maxExplorationDepth: 3,
  parallelExplorations: 3,
} as const;

/**
 * Phase order for workflow progression
 */
export const PHASE_ORDER: FeatureDevPhase[] = [
  "understand",
  "explore",
  "plan",
  "implement",
  "verify",
  "review",
  "finalize",
] as const;

/**
 * Phase descriptions
 */
export const PHASE_DESCRIPTIONS: Record<FeatureDevPhase, string> = {
  understand: "Clarify requirements and gather context",
  explore: "Search codebase for relevant code and patterns",
  plan: "Design the implementation approach",
  implement: "Write the code changes",
  verify: "Run tests and validate changes",
  review: "Self-review the implementation",
  finalize: "Commit changes and cleanup",
} as const;

/**
 * Phase prompts for guiding the agent
 */
export const PHASE_PROMPTS: Record<FeatureDevPhase, string> = {
  understand: `You are in the UNDERSTAND phase of feature development.

Your goal is to fully understand what needs to be built before writing any code.

Tasks:
1. Analyze the user's feature request
2. Identify unclear or ambiguous requirements
3. Ask clarifying questions if needed
4. Document the understood requirements

Output a summary of:
- What the feature should do
- User-facing behavior
- Technical requirements
- Edge cases to consider
- Any assumptions made

If anything is unclear, ask the user for clarification before proceeding.`,

  explore: `You are in the EXPLORE phase of feature development.

Your goal is to understand the existing codebase before making changes.

Tasks:
1. Search for related code using grep and glob
2. Identify files that will need to be modified
3. Understand existing patterns and conventions
4. Find similar implementations to reference
5. Identify potential dependencies or impacts

Run multiple parallel searches to gather context efficiently.

Document your findings:
- Relevant files and their purposes
- Existing patterns to follow
- Code that might be affected
- Useful examples in the codebase`,

  plan: `You are in the PLAN phase of feature development.

Your goal is to create a detailed implementation plan before writing code.

Tasks:
1. Design the solution architecture
2. List files to create, modify, or delete
3. Define the order of changes
4. Identify risks and dependencies
5. Plan the testing approach

Create a plan that includes:
- Summary of the approach
- Step-by-step implementation order
- File changes with descriptions
- Potential risks and mitigations
- Test cases to verify the feature

Present this plan for user approval before proceeding.`,

  implement: `You are in the IMPLEMENT phase of feature development.

Your goal is to write the code according to the approved plan.

Tasks:
1. Follow the implementation plan step by step
2. Write clean, well-documented code
3. Follow existing code patterns and conventions
4. Create necessary files and make required changes
5. Track all changes made

Guidelines:
- Implement one step at a time
- Test each change locally if possible
- Keep changes focused and minimal
- Add comments for complex logic
- Update imports and exports as needed`,

  verify: `You are in the VERIFY phase of feature development.

Your goal is to ensure the implementation works correctly.

Tasks:
1. Run the test suite
2. Add new tests for the feature
3. Fix any failing tests
4. Check for regressions
5. Verify edge cases

Report:
- Test results (pass/fail counts)
- Coverage information if available
- Any issues discovered
- Additional tests needed`,

  review: `You are in the REVIEW phase of feature development.

Your goal is to self-review the implementation for quality.

Tasks:
1. Review all changes made
2. Check for code quality issues
3. Verify documentation is complete
4. Look for potential bugs
5. Ensure best practices are followed

Review criteria:
- Code clarity and readability
- Error handling
- Edge cases covered
- Performance considerations
- Security implications
- Documentation completeness

Report any findings that need attention.`,

  finalize: `You are in the FINALIZE phase of feature development.

Your goal is to complete the feature implementation.

Tasks:
1. Create a commit with appropriate message
2. Update any documentation
3. Clean up temporary files
4. Prepare summary of changes

Output:
- Final list of changes
- Commit message (if committing)
- Any follow-up tasks recommended
- Success confirmation`,
} as const;

/**
 * Checkpoint configuration per phase
 */
export const PHASE_CHECKPOINTS: Record<
  FeatureDevPhase,
  { required: boolean; title: string }
> = {
  understand: {
    required: true,
    title: "Requirements Confirmation",
  },
  explore: {
    required: false,
    title: "Exploration Summary",
  },
  plan: {
    required: true,
    title: "Implementation Plan Approval",
  },
  implement: {
    required: false,
    title: "Implementation Progress",
  },
  verify: {
    required: true,
    title: "Test Results Review",
  },
  review: {
    required: true,
    title: "Code Review Findings",
  },
  finalize: {
    required: true,
    title: "Final Approval",
  },
} as const;

/**
 * Error messages
 */
export const FEATURE_DEV_ERRORS = {
  INVALID_PHASE: (phase: string) => `Invalid phase: ${phase}`,
  INVALID_TRANSITION: (from: FeatureDevPhase, to: FeatureDevPhase) =>
    `Cannot transition from ${from} to ${to}`,
  CHECKPOINT_REQUIRED: (phase: FeatureDevPhase) =>
    `User approval required for ${phase} phase`,
  PHASE_FAILED: (phase: FeatureDevPhase, reason: string) =>
    `Phase ${phase} failed: ${reason}`,
  WORKFLOW_ABORTED: (reason: string) => `Workflow aborted: ${reason}`,
  NO_PLAN: "Cannot implement without an approved plan",
  TEST_FAILURE: "Tests failed - review required before proceeding",
} as const;

/**
 * Status messages
 */
export const FEATURE_DEV_MESSAGES = {
  STARTING: (phase: FeatureDevPhase) => `Starting ${phase} phase...`,
  COMPLETED: (phase: FeatureDevPhase) => `Completed ${phase} phase`,
  AWAITING_APPROVAL: (phase: FeatureDevPhase) =>
    `Awaiting approval for ${phase}`,
  CHECKPOINT: (title: string) => `Checkpoint: ${title}`,
  EXPLORING: (query: string) => `Exploring: ${query}`,
  IMPLEMENTING_STEP: (step: number, total: number) =>
    `Implementing step ${step}/${total}`,
  RUNNING_TESTS: "Running tests...",
  REVIEWING: "Reviewing changes...",
  FINALIZING: "Finalizing changes...",
} as const;

/**
 * Allowed phase transitions
 */
export const ALLOWED_TRANSITIONS: Record<FeatureDevPhase, FeatureDevPhase[]> = {
  understand: ["explore", "plan"], // Can skip explore if simple
  explore: ["plan", "understand"], // Can go back to understand
  plan: ["implement", "explore", "understand"], // Can go back
  implement: ["verify", "plan"], // Can revise plan
  verify: ["review", "implement"], // Can fix issues
  review: ["finalize", "implement"], // Can fix issues
  finalize: [], // Terminal state
} as const;

/**
 * Phase timeout configuration (in ms)
 */
export const PHASE_TIMEOUTS: Record<FeatureDevPhase, number> = {
  understand: 120000,
  explore: 180000,
  plan: 120000,
  implement: 600000,
  verify: 300000,
  review: 120000,
  finalize: 60000,
} as const;
