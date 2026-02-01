# Contributing to CodeTyper CLI

Thank you for your interest in contributing to CodeTyper CLI! This document provides guidelines and instructions for contributing.

## Code of Conduct

Please be respectful and constructive in all interactions. We welcome contributors of all experience levels.

## Getting Started

### Prerequisites

- Node.js >= 18.0.0
- npm or yarn
- Git

### Setup

1. Fork the repository
2. Clone your fork:
   ```bash
   git clone https://github.com/YOUR_USERNAME/codetyper-cli.git
   cd codetyper-cli
   ```
3. Install dependencies:
   ```bash
   npm install
   ```
4. Build the project:
   ```bash
   npm run build
   ```
5. Link for local testing:
   ```bash
   npm link
   ```

### Development Workflow

```bash
# Start TypeScript watch mode
npm run dev

# Run tests
npm test

# Lint code
npm run lint

# Format code
npm run format
```

## How to Contribute

### Reporting Bugs

1. Check existing issues to avoid duplicates
2. Create a new issue with:
   - Clear, descriptive title
   - Steps to reproduce
   - Expected vs actual behavior
   - Environment details (OS, Node version, provider)
   - Relevant logs or screenshots

### Suggesting Features

1. Check existing issues for similar requests
2. Create a feature request with:
   - Clear description of the feature
   - Use cases and motivation
   - Proposed implementation (optional)

### Submitting Pull Requests

1. Create a branch from `main`:
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. Make your changes following our coding standards

3. Write/update tests if applicable

4. Ensure all tests pass:
   ```bash
   npm test
   ```

5. Commit with clear messages:
   ```bash
   git commit -m "feat: add new feature description"
   ```

6. Push and create a Pull Request

### Commit Message Format

We follow [Conventional Commits](https://www.conventionalcommits.org/):

- `feat:` - New feature
- `fix:` - Bug fix
- `docs:` - Documentation changes
- `style:` - Code style changes (formatting, etc.)
- `refactor:` - Code refactoring
- `test:` - Adding or updating tests
- `chore:` - Maintenance tasks

Examples:
```
feat: add permission caching for faster lookups
fix: resolve race condition in agent loop
docs: update README with new CLI options
```

## Coding Standards

### TypeScript

- Use TypeScript strict mode
- Define explicit types (avoid `any` when possible)
- Use interfaces for object shapes
- Export types that are part of the public API

### Code Style

- Use 2 spaces for indentation
- Use single quotes for strings
- Add trailing commas in multi-line structures
- Keep lines under 100 characters when reasonable

### File Organization

```
src/
├── index.ts          # Entry point only
├── commands/         # CLI command implementations
├── constants/        # Centralized constants
├── interfaces/       # Interface definitions
├── providers/        # LLM provider integrations
├── services/         # Business logic services
│   ├── hooks-service.ts    # Lifecycle hooks
│   ├── plugin-service.ts   # Plugin management
│   ├── plugin-loader.ts    # Plugin discovery
│   └── session-fork-service.ts  # Session forking
├── stores/           # Zustand state stores
│   └── vim-store.ts  # Vim mode state
├── tools/            # Agent tools (bash, read, write, edit)
├── tui/              # Terminal UI components
│   ├── components/   # Reusable UI components
│   └── hooks/        # React hooks (useVimMode, etc.)
└── types/            # Type definitions
```

### Testing

- Write tests for non-UI logic
- Place tests in `tests/` directory
- Name test files `*.test.ts`
- Use descriptive test names

```typescript
describe('PermissionManager', () => {
  it('should match wildcard patterns correctly', () => {
    // ...
  });
});
```

### Documentation

- Add JSDoc comments for public APIs
- Update README for user-facing changes
- Update CHANGELOG for notable changes

## Project Structure

### Key Files

| File | Purpose |
|------|---------|
| `src/index.ts` | CLI entry point, command registration |
| `src/services/agent.ts` | Agent loop, tool orchestration |
| `src/services/permissions.ts` | Permission system |
| `src/services/hooks-service.ts` | Lifecycle hooks |
| `src/services/plugin-service.ts` | Plugin management |
| `src/services/session-fork-service.ts` | Session forking |
| `src/commands/chat-tui.tsx` | Main TUI command |
| `src/tui/App.tsx` | Root TUI component |
| `src/tui/store.ts` | Zustand state management |
| `src/stores/vim-store.ts` | Vim mode state |
| `src/tui/hooks/useVimMode.ts` | Vim keyboard handling |

### Adding a New Provider

1. Create `src/providers/yourprovider.ts`
2. Implement the `Provider` interface
3. Register in `src/providers/index.ts`
4. Add authentication in `src/commands/login.ts`
5. Update documentation

### Adding a New Tool

1. Create `src/tools/yourtool.ts`
2. Define parameters with Zod schema
3. Implement `execute` function
4. Register in `src/tools/index.ts`
5. Add permission handling if needed

### Adding a Hook Event

1. Add event type to `src/types/hooks.ts`
2. Add constants to `src/constants/hooks.ts`
3. Add input type for the event
4. Implement execution in `src/services/hooks-service.ts`
5. Call hook from appropriate location

### Creating a Plugin

1. Create directory in `.codetyper/plugins/{name}/`
2. Add `plugin.json` manifest
3. Add tools in `tools/*.ts`
4. Add commands in `commands/*.md`
5. Add hooks in `hooks/*.sh`

### Adding Vim Bindings

1. Add binding to `VIM_DEFAULT_BINDINGS` in `src/constants/vim.ts`
2. Add action handler in `src/tui/hooks/useVimMode.ts`
3. Update documentation

## Questions?

- Open a GitHub issue for questions
- Tag with `question` label

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
