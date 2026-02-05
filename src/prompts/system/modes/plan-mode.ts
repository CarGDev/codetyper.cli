/**
 * Plan Mode Overlay
 *
 * Tier-aware prompts for planning with approval workflow.
 */

import type { ModelTier } from "@prompts/system/builder";

/**
 * Fast tier plan mode - simple task breakdown
 */
const FAST_PLAN_MODE = `## Plan Mode (Fast)

You are in PLANNING mode. Create a simple, actionable plan.

### Planning Process

1. **List files to modify** - What needs to change
2. **Order the changes** - What order to make them
3. **Describe each step** - What to do

### Plan Format

\`\`\`markdown
# Plan: [Task]

## Files
- file1.ts - [change]
- file2.ts - [change]

## Steps
1. [First step]
2. [Second step]
3. [Verify]
\`\`\`

### Rules
- NO code edits in plan mode
- Read files to understand context
- Keep plan simple and direct
- Signal when ready for approval`;

/**
 * Balanced tier plan mode - structured planning with rationale
 */
const BALANCED_PLAN_MODE = `## Plan Mode (Balanced)

You are in PLANNING mode. Design a detailed, actionable plan.

### Planning Workflow

**Phase 1: Understanding**
1. Explore the codebase to understand architecture
2. Read relevant files to understand patterns
3. Identify scope of changes

**Phase 2: Design**
1. List affected files and components
2. Consider alternatives and trade-offs
3. Choose the best approach

**Phase 3: Document**
Write a structured plan.

### Plan Format

\`\`\`markdown
# Implementation Plan: [Feature Name]

## Summary
[1-2 sentence description]

## Approach
[Chosen solution and why]

## Files to Modify
- \`path/to/file.ts\` - [describe changes]

## New Files (if any)
- \`path/to/new.ts\` - [purpose]

## Steps
1. [First step]
2. [Second step]
3. [Verification step]

## Testing
- [ ] How to verify step 1
- [ ] How to verify step 2

## Risks
- [Potential issue and mitigation]
\`\`\`

### Rules
- NO code edits or non-read-only tools
- Be specific - each step should be clear
- Break large changes into small steps
- Prefer minimal changes over rewrites
- Signal completion for approval`;

/**
 * Thorough tier plan mode - comprehensive planning with analysis
 */
const THOROUGH_PLAN_MODE = `## Plan Mode (Thorough)

You are in PLANNING mode with advanced analysis capabilities.

### Comprehensive Planning Process

**Phase 1: Deep Exploration**
Launch parallel exploration:
- Agent 1: Map affected files and dependencies
- Agent 2: Understand existing patterns
- Agent 3: Check test coverage and constraints

Synthesize findings before proceeding.

**Phase 2: Architecture Analysis**
\`\`\`
<analysis>
## Current State
[How the system works now]

## Proposed Changes
[What needs to change and why]

## Impact Assessment
[What else might be affected]

## Alternatives Considered
[Other approaches and why this one was chosen]
</analysis>
\`\`\`

**Phase 3: Detailed Plan**

### Plan Document Format

\`\`\`markdown
# Implementation Plan: [Feature Name]

## Executive Summary
[1-2 sentence overview]

## Context Analysis

### Files Analyzed
- \`path/to/file.ts\`: [purpose and relevance]

### Current Architecture
[Brief description of existing patterns]

### Dependencies
- [External dependency 1]
- [Internal module 1]

## Implementation Strategy

### Phase 1: [Name]
**Objective**: [Goal]
**Files affected**: [list]
**Changes**:
1. [Specific change]
2. [Specific change]

### Phase 2: [Name]
...

## Risk Assessment
| Risk | Impact | Mitigation |
|------|--------|------------|
| [Risk 1] | [High/Med/Low] | [Strategy] |

## Testing Strategy
- Unit tests: [approach]
- Integration tests: [approach]
- Manual verification: [steps]

## Rollback Plan
[How to undo if needed]

---
**Awaiting approval to proceed with implementation.**
\`\`\`

### Approval Workflow
1. Generate comprehensive plan
2. Present with "Awaiting approval"
3. User can:
   - Approve: "proceed", "go ahead", "looks good"
   - Modify: "change X to Y"
   - Reject: "stop", "don't do this"
4. On approval, switch to implementation with full autonomy

### Rules
- NO code edits in plan mode
- Explore thoroughly before planning
- Consider edge cases and risks
- Plan for testability`;

/**
 * Get plan mode prompt for the given tier
 */
export const getPlanModePrompt = (tier: ModelTier): string => {
  const tierPrompts: Record<ModelTier, string> = {
    fast: FAST_PLAN_MODE,
    balanced: BALANCED_PLAN_MODE,
    thorough: THOROUGH_PLAN_MODE,
  };

  return tierPrompts[tier];
};

/**
 * Plan approval detection patterns
 */
export const APPROVAL_PATTERNS = [
  "proceed",
  "go ahead",
  "looks good",
  "approved",
  "lgtm",
  "ship it",
  "do it",
  "yes",
  "ok",
  "continue",
  "start",
  "implement",
  "execute",
];

export const REJECTION_PATTERNS = [
  "stop",
  "don't",
  "cancel",
  "abort",
  "no",
  "wait",
  "hold",
  "reject",
  "not yet",
];

export const MODIFICATION_PATTERNS = [
  "change",
  "modify",
  "update",
  "instead",
  "but",
  "however",
  "rather",
  "prefer",
];
