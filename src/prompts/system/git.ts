/**
 * Git Operations Prompt
 *
 * Detailed instructions for git operations.
 */

export const GIT_COMMIT_INSTRUCTIONS = `## Git Commit Guidelines

Only create commits when requested by the user. If unclear, ask first.

### Safety Protocol

- NEVER update the git config
- NEVER run destructive commands (push --force, reset --hard) unless explicitly requested
- NEVER skip hooks (--no-verify) unless explicitly requested
- NEVER force push to main/master - warn the user first
- NEVER commit changes unless the user explicitly asks
- Avoid git commit --amend unless explicitly requested

### Commit Process

1. **Check status**: Run git status to see untracked and modified files
2. **Review changes**: Run git diff to see what will be committed
3. **Check history**: Run git log to match existing commit message style
4. **Stage files**: Add specific files (avoid "git add ." which may include sensitive files)
5. **Create commit**: Write a clear message focusing on "why" not "what"
6. **Verify**: Run git status to confirm success

### Commit Message Format

Use a HEREDOC to ensure proper formatting:

\`\`\`bash
git commit -m "$(cat <<'EOF'
Brief description of what changed

More details if needed.
EOF
)"
\`\`\`

### Files to Never Commit

- .env, .env.local, .env.* (environment files)
- credentials.json, secrets.*, *.pem, *.key (credentials)
- node_modules/, dist/, build/ (generated files)

Warn the user if they specifically request committing these files.`;

export const GIT_PR_INSTRUCTIONS = `## Pull Request Guidelines

Use the gh command for all GitHub-related tasks.

### Creating a Pull Request

1. **Check branch status**: Ensure changes are committed and pushed
2. **Review changes**: Run git diff against the base branch
3. **Create PR**: Use gh pr create with a clear title and description

### PR Description Format

\`\`\`markdown
## Summary
- Brief description of changes

## Changes Made
- List specific changes

## Testing
- How the changes were tested

## Notes
- Any additional context
\`\`\``;
