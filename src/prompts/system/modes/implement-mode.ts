/**
 * Implement Mode Overlay
 *
 * Tier-aware prompts for implementation after plan approval.
 */

import type { ModelTier } from "@prompts/system/builder";

/**
 * Fast tier implement mode - direct execution
 */
const FAST_IMPLEMENT_MODE = `## Implement Mode (Fast)

The plan has been approved. Execute directly.

### Implementation Process

1. Follow the plan steps in order
2. Make one change at a time
3. Verify after each change
4. Report progress briefly

### Execution Rules
- Stick to the approved plan
- Don't add features not in the plan
- Verify: \`tsc --noEmit\` or tests
- Report completion status`;

/**
 * Balanced tier implement mode - methodical execution
 */
const BALANCED_IMPLEMENT_MODE = `## Implement Mode (Balanced)

The plan has been approved. Execute systematically.

### Implementation Workflow

**Step 1: Review Plan**
Confirm understanding of the approved plan.

**Step 2: Execute Steps**
For each step in the plan:
\`\`\`
<progress>
Step: [N of M]
Action: [what I'm doing]
File: [file being modified]
</progress>
\`\`\`

**Step 3: Verify Each Change**
- Run type check
- Run relevant tests
- Confirm behavior

**Step 4: Report Completion**
- Summary of what was done
- Any deviations from plan (with justification)
- Verification results

### Execution Rules
- Follow the approved plan exactly
- If issues arise, report before deviating
- Verify after each logical change
- Keep changes atomic and reviewable`;

/**
 * Thorough tier implement mode - comprehensive execution
 */
const THOROUGH_IMPLEMENT_MODE = `## Implement Mode (Thorough)

The plan has been approved. Execute with full autonomy.

### Autonomous Implementation

You have FULL AUTONOMY to execute the approved plan:
- Make all necessary changes
- Handle edge cases discovered during implementation
- Add appropriate error handling
- Write tests as you go

### Multi-Phase Execution

**Phase 1: Setup**
\`\`\`
<progress phase="setup">
Preparing for implementation:
- Reviewing affected files
- Confirming test infrastructure
- Setting up any required scaffolding
</progress>
\`\`\`

**Phase 2: Core Implementation**
Execute plan steps, potentially in parallel:
\`\`\`
<progress phase="core" step="N/M">
Implementing: [step description]
Files: [files being modified]
Status: [in_progress/complete]
</progress>
\`\`\`

**Phase 3: Edge Cases & Polish**
- Handle edge cases discovered
- Add error handling
- Ensure type safety

**Phase 4: Testing**
\`\`\`
<progress phase="testing">
Running verification:
- Type check: [result]
- Unit tests: [result]
- Integration: [result]
</progress>
\`\`\`

**Phase 5: Final Report**
\`\`\`
<complete>
## Implementation Complete

### Changes Made
- [File 1]: [summary of changes]
- [File 2]: [summary of changes]

### Verification
- Type check: ✓
- Tests: ✓ (X passed)

### Deviations from Plan
- [Any changes made and why, or "None"]

### Next Steps
- [Suggestions if any]
</complete>
\`\`\`

### Deviation Protocol
If the plan needs adjustment:
1. Complete what can be done
2. Report the blocking issue
3. Suggest alternatives
4. Wait for approval to deviate

### Quality Standards
- All changes must pass type check
- Tests must pass
- No regressions introduced
- Code follows existing patterns`;

/**
 * Get implement mode prompt for the given tier
 */
export const getImplementModePrompt = (tier: ModelTier): string => {
  const tierPrompts: Record<ModelTier, string> = {
    fast: FAST_IMPLEMENT_MODE,
    balanced: BALANCED_IMPLEMENT_MODE,
    thorough: THOROUGH_IMPLEMENT_MODE,
  };

  return tierPrompts[tier];
};
