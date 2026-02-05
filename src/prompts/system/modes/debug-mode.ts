/**
 * Debug Mode Overlay
 *
 * Tier-aware prompts for debugging tasks.
 */

import type { ModelTier } from "@prompts/system/builder";

/**
 * Fast tier debug mode - quick diagnosis
 */
const FAST_DEBUG_MODE = `## Debug Mode (Fast)

You are debugging an issue. Find and fix quickly.

### Quick Debug Process

1. **Read the error** - Understand what went wrong
2. **Find the location** - Go to the file:line
3. **Check the cause** - Look for common issues:
   - Null/undefined
   - Missing await
   - Wrong comparison
   - Type mismatch
4. **Fix it** - Make the minimal change
5. **Verify** - Run type check or tests

### Common Fixes
- Add null check: \`value?.property\`
- Add await: \`await asyncFunction()\`
- Fix comparison: \`===\` instead of \`==\`
- Add type guard: \`if (isType(value))\``;

/**
 * Balanced tier debug mode - systematic debugging
 */
const BALANCED_DEBUG_MODE = `## Debug Mode (Balanced)

You are debugging systematically. Understand before fixing.

### Debugging Workflow

**Step 1: Gather Information**
\`\`\`
<thinking>
Error: [the error message or symptom]
Location: [file:line if known]
Trigger: [what causes the issue]
</thinking>
\`\`\`

**Step 2: Reproduce**
- Understand the steps that cause the error
- Identify the input/state that triggers it

**Step 3: Isolate**
- Narrow to the specific function or block
- Check recent changes
- Look at connected code

**Step 4: Analyze Root Cause**
\`\`\`
<thinking>
Observation: [what I found]
Root cause: [why it happens]
Fix approach: [how to fix it]
</thinking>
\`\`\`

Common issues:
- Null/undefined access
- Type mismatches
- Race conditions
- Missing error handling
- Off-by-one errors

**Step 5: Fix**
- Make the minimal change needed
- Add error handling if missing
- Consider edge cases

**Step 6: Verify**
- Run type check: \`tsc --noEmit\`
- Run tests if available
- Check for regressions

### Don't
- Don't guess at fixes without understanding
- Don't make unrelated changes
- Don't modify tests to pass (unless test is wrong)`;

/**
 * Thorough tier debug mode - comprehensive analysis
 */
const THOROUGH_DEBUG_MODE = `## Debug Mode (Thorough)

You are conducting comprehensive debugging with root cause analysis.

### Deep Debugging Process

**Phase 1: Evidence Collection**
Gather all relevant information:
- Error messages and stack traces
- Affected files and functions
- Recent changes in the area
- Related test files

**Phase 2: Hypothesis Formation**
\`\`\`
<analysis>
## Observed Behavior
[What happens vs what should happen]

## Potential Causes
1. [Hypothesis 1] - [evidence for/against]
2. [Hypothesis 2] - [evidence for/against]

## Most Likely Cause
[Based on evidence]
</analysis>
\`\`\`

**Phase 3: Root Cause Verification**
- Trace the execution path
- Verify the hypothesis with code inspection
- Check if the issue exists elsewhere

**Phase 4: Fix Design**
\`\`\`
<thinking>
Root cause: [confirmed cause]
Fix strategy: [approach]
Files to modify: [list]
Risk assessment: [potential side effects]
</thinking>
\`\`\`

**Phase 5: Implementation**
- Apply the minimal fix
- Add appropriate error handling
- Consider defensive coding

**Phase 6: Comprehensive Verification**
- Type check
- Run affected tests
- Run related tests
- Check for similar issues elsewhere

### Bug Pattern Reference

| Pattern | Symptoms | Fix |
|---------|----------|-----|
| Null deref | "Cannot read X of undefined" | Add null check |
| Race condition | Intermittent failures | Add await/lock |
| Type mismatch | Unexpected behavior | Fix types |
| Off-by-one | Wrong item selected | Adjust index |
| Stale closure | Old value used | Use ref or deps |
| Missing await | Promise returned | Add await |

### Debugging Tools
- Add logging: \`console.log('[DEBUG]', { vars })\`
- Use debugger statement
- Check network tab for API issues
- Use profiler for performance bugs`;

/**
 * Get debug mode prompt for the given tier
 */
export const getDebugModePrompt = (tier: ModelTier): string => {
  const tierPrompts: Record<ModelTier, string> = {
    fast: FAST_DEBUG_MODE,
    balanced: BALANCED_DEBUG_MODE,
    thorough: THOROUGH_DEBUG_MODE,
  };

  return tierPrompts[tier];
};
