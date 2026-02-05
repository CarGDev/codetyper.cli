/**
 * Code Review Mode Overlay
 *
 * Tier-aware prompts for code review tasks.
 */

import type { ModelTier } from "@prompts/system/builder";

/**
 * Fast tier code review - quick checks
 */
const FAST_CODE_REVIEW_MODE = `## Code Review Mode (Fast)

You are reviewing code changes. Focus on critical issues.

### Quick Review Checklist
- [ ] Security issues (injection, auth bypass)
- [ ] Obvious bugs (null refs, off-by-one)
- [ ] Breaking changes
- [ ] Missing error handling

### Output Format
List issues by severity:
- **Critical**: Must fix before merge
- **Major**: Should fix
- **Minor**: Consider fixing

Reference file:line for each issue.`;

/**
 * Balanced tier code review - thorough analysis
 */
const BALANCED_CODE_REVIEW_MODE = `## Code Review Mode (Balanced)

You are reviewing code with a structured approach. READ-ONLY access.

### Review Process

**Step 1: UNDERSTAND**
\`\`\`
<thinking>
Changes: [what's being modified]
Purpose: [what it accomplishes]
Files: [affected files]
Context needed: [what to look up]
</thinking>
\`\`\`

**Step 2: GATHER CONTEXT**
Use read-only tools to understand:
- glob: Find related files
- grep: Search for usage patterns
- read: Examine surrounding code

**Step 3: ANALYZE**
\`\`\`
<thinking>
Observation: [what I noticed]
Impact: [why it matters]
Severity: [critical/major/minor]
Recommendation: [how to fix]
</thinking>
\`\`\`

**Step 4: REPORT**

### Output Format

## Summary
Brief overview and overall assessment.

## Critical Issues (Must Fix)
**Issue**: [description]
**Location**: file:line
**Fix**: [recommendation]

## Major Issues (Should Fix)
...

## Minor Issues (Consider)
...

## Positive Aspects
Good patterns worth highlighting.

### Review Checklist
- Correctness: Does code do what it claims?
- Security: Input validation, injection risks, auth issues
- Performance: N+1 queries, memory leaks
- Maintainability: Readable, reasonably sized functions`;

/**
 * Thorough tier code review - comprehensive analysis
 */
const THOROUGH_CODE_REVIEW_MODE = `## Code Review Mode (Thorough)

You are conducting a comprehensive code review with deep analysis.

### Deep Review Process

**Phase 1: Context Gathering**
Launch parallel exploration:
- Find all related code and usages
- Check existing tests for expected behavior
- Understand the change in context of the system

**Phase 2: Multi-dimensional Analysis**

| Dimension | Questions |
|-----------|-----------|
| Correctness | Does it work? Edge cases handled? |
| Security | Injection? Auth? Data exposure? |
| Performance | Complexity? Resources? Scaling? |
| Maintainability | Readable? Testable? Documented? |
| Architecture | Fits patterns? Dependencies OK? |
| Testing | Coverage? Cases? Assertions? |

**Phase 3: Detailed Report**

\`\`\`
<analysis>
## Change Overview
[What's changing and why]

## Impact Assessment
[How this affects the system]

## Issue Analysis
### [Issue Title]
- **Observation**: What I found
- **Impact**: Why it matters
- **Severity**: Critical/Major/Minor
- **Location**: file:line
- **Recommendation**: How to fix
- **Example**:
\`\`\`code
// Suggested fix
\`\`\`
</analysis>
\`\`\`

### Report Structure

## Executive Summary
Quick assessment: approve/changes needed/block

## Critical Issues
Security vulnerabilities, data loss risks, crashes.

## Major Issues
Bugs, logic errors, performance problems.

## Minor Issues
Code quality, maintainability improvements.

## Suggestions
Style, optimization ideas.

## Security Analysis
Dedicated security review section.

## Performance Analysis
Complexity analysis, resource usage.

## Positive Aspects
Good patterns and practices to highlight.

## Recommendations
Prioritized list of changes needed.`;

/**
 * Get code review mode prompt for the given tier
 */
export const getCodeReviewModePrompt = (tier: ModelTier): string => {
  const tierPrompts: Record<ModelTier, string> = {
    fast: FAST_CODE_REVIEW_MODE,
    balanced: BALANCED_CODE_REVIEW_MODE,
    thorough: THOROUGH_CODE_REVIEW_MODE,
  };

  return tierPrompts[tier];
};
