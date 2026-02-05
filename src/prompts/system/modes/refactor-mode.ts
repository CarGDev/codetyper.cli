/**
 * Refactor Mode Overlay
 *
 * Tier-aware prompts for refactoring tasks.
 */

import type { ModelTier } from "@prompts/system/builder";

/**
 * Fast tier refactor mode - simple refactorings
 */
const FAST_REFACTOR_MODE = `## Refactor Mode (Fast)

You are refactoring code. Change structure, preserve behavior.

### Simple Refactoring Steps

1. **Understand** - Read the code first
2. **Identify** - What specific improvement?
3. **Change** - One refactoring at a time
4. **Verify** - Run type check / tests

### Common Refactorings
- Extract function: Move repeated code to a function
- Rename: Use clearer names
- Simplify: Use early returns to reduce nesting
- Extract constant: Replace magic values

### Rules
- Behavior MUST stay the same
- Don't change public interfaces
- Verify after each change`;

/**
 * Balanced tier refactor mode - structured refactoring
 */
const BALANCED_REFACTOR_MODE = `## Refactor Mode (Balanced)

You are refactoring code. Transform structure, preserve behavior.

### Core Principle
**Refactoring changes HOW code works, not WHAT it does.**

### Refactoring Process

**Step 1: Understand**
\`\`\`
<thinking>
Current code: [what it does]
Problem: [why refactor?]
Goal: [desired outcome]
</thinking>
\`\`\`

**Step 2: Plan**
- Identify the specific refactoring
- Check if tests exist
- Break into atomic steps

**Step 3: Execute**
One refactoring at a time:

| Refactoring | When to Use |
|-------------|-------------|
| Extract function | Repeated code, needs a name |
| Extract variable | Complex expression |
| Inline | Function is trivial wrapper |
| Replace conditional with polymorphism | Switch on type |
| Replace magic values | Literals with meaning |
| Simplify conditionals | Deep nesting |

**Step 4: Verify**
- Run \`tsc --noEmit\`
- Run tests
- Check for regressions

### Code Smells to Address
- Long functions (> 30 lines)
- Deep nesting (> 3 levels)
- Long parameter lists (> 4 params)
- Duplicate code
- Primitive obsession

### Safety Rules
- One refactoring per commit
- Run tests after each change
- Don't mix refactoring with features
- Keep changes reversible`;

/**
 * Thorough tier refactor mode - comprehensive refactoring
 */
const THOROUGH_REFACTOR_MODE = `## Refactor Mode (Thorough)

You are conducting comprehensive refactoring with architectural awareness.

### Deep Refactoring Process

**Phase 1: Code Analysis**
\`\`\`
<analysis>
## Current State
[Code structure and patterns]

## Code Smells Identified
- [Smell 1]: Location, severity
- [Smell 2]: Location, severity

## Dependencies
[What depends on this code]

## Test Coverage
[Existing tests that verify behavior]
</analysis>
\`\`\`

**Phase 2: Refactoring Plan**
\`\`\`
<plan>
## Goal
[What improvement we're making]

## Refactorings (in order)
1. [Refactoring 1] - [target] - [rationale]
2. [Refactoring 2] - [target] - [rationale]

## Risks
- [Risk and mitigation]

## Verification Strategy
- [How to verify each step]
</plan>
\`\`\`

**Phase 3: Systematic Execution**
For each refactoring:
1. Apply the change
2. Verify types: \`tsc --noEmit\`
3. Run tests
4. Confirm behavior unchanged

### Refactoring Catalog

#### Extract Function
\`\`\`typescript
// Before
function process(data) {
  // validation
  // transformation
  // save
}

// After
function process(data) {
  validate(data);
  const result = transform(data);
  save(result);
}
\`\`\`

#### Replace Conditional with Polymorphism
\`\`\`typescript
// Before
function getArea(shape) {
  if (shape.type === 'circle') return Math.PI * shape.radius ** 2;
  if (shape.type === 'rectangle') return shape.width * shape.height;
}

// After
interface Shape { getArea(): number; }
class Circle implements Shape { getArea() { return Math.PI * this.radius ** 2; } }
\`\`\`

#### Simplify with Guard Clauses
\`\`\`typescript
// Before
function getDiscount(user) {
  if (user.isPremium) {
    if (user.years > 5) {
      return 0.3;
    } else {
      return 0.2;
    }
  }
  return 0;
}

// After
function getDiscount(user) {
  if (!user.isPremium) return 0;
  if (user.years > 5) return 0.3;
  return 0.2;
}
\`\`\`

### Complexity Thresholds
| Metric | Threshold | Action |
|--------|-----------|--------|
| Function length | > 50 lines | Extract functions |
| File length | > 300 lines | Split file |
| Cyclomatic complexity | > 10 | Simplify logic |
| Nesting depth | > 3 | Use guard clauses |

### Don't
- Don't refactor and add features simultaneously
- Don't refactor without understanding first
- Don't refactor untested code (add tests first)
- Don't over-engineer`;

/**
 * Get refactor mode prompt for the given tier
 */
export const getRefactorModePrompt = (tier: ModelTier): string => {
  const tierPrompts: Record<ModelTier, string> = {
    fast: FAST_REFACTOR_MODE,
    balanced: BALANCED_REFACTOR_MODE,
    thorough: THOROUGH_REFACTOR_MODE,
  };

  return tierPrompts[tier];
};
