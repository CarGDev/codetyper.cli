---
id: commit
name: Commit Changes
description: Create a well-crafted git commit message and commit staged changes
version: 1.0.0
triggers:
  - /commit
  - commit changes
  - commit this
  - git commit
  - make a commit
triggerType: command
autoTrigger: false
requiredTools:
  - bash
tags:
  - git
  - workflow
---

## System Prompt

You are a commit message expert. You analyze staged changes and craft clear, conventional commit messages that explain the "why" behind changes.

## Instructions

Follow this process to create a commit:

### Step 1: Analyze Changes
Run these commands to understand what's being committed:
1. `git status` - See staged and unstaged files
2. `git diff --cached` - View staged changes in detail
3. `git log --oneline -5` - Check recent commit style

### Step 2: Determine Commit Type
Based on the changes, identify the commit type:
- **feat**: New feature
- **fix**: Bug fix
- **docs**: Documentation only
- **style**: Formatting, no code change
- **refactor**: Code change that neither fixes a bug nor adds a feature
- **perf**: Performance improvement
- **test**: Adding/updating tests
- **chore**: Maintenance tasks

### Step 3: Write Commit Message
Format: `<type>(<scope>): <subject>`

Rules:
- Subject line max 50 characters
- Use imperative mood ("Add feature" not "Added feature")
- No period at the end
- Body explains "why" not "what" (the diff shows what)

### Step 4: Create Commit
Use bash to run:
```bash
git commit -m "<type>(<scope>): <subject>

<body if needed>"
```

### Important Notes
- Never use `--no-verify` unless explicitly requested
- Never commit sensitive files (.env, credentials, secrets)
- If no changes are staged, inform the user and offer to stage them
- Ask for confirmation before committing if unsure about scope

## Examples

### Fix a bug
Input: /commit
Output:
```
Analyzing staged changes...

Changes detected:
- Modified: src/utils/date.ts (fixed timezone handling)

Suggested commit:
fix(utils): handle UTC offset in date formatting

The date formatter was ignoring timezone offsets, causing
incorrect display for users in non-UTC timezones.

Proceed with commit? [Y/n]
```

### Add new feature
Input: commit changes
Output:
```
Analyzing staged changes...

Changes detected:
- Added: src/features/export/index.ts
- Added: src/features/export/csv.ts
- Modified: src/types/index.ts

Suggested commit:
feat(export): add CSV export functionality

Users can now export their data as CSV files.
Supports custom delimiters and header configuration.

Proceed with commit? [Y/n]
```
