# Contributing to CodeTyper CLI

Thank you for your interest in contributing to CodeTyper CLI! This document provides guidelines and instructions for contributing.

## Code of Conduct

Please be respectful and constructive in all interactions. We welcome contributors of all experience levels.

## Getting Started

### Prerequisites

- [Bun](https://bun.sh) >= 1.0.0
- Git

### Setup

1. Fork the repository
2. Clone your fork:
   ```bash
   git clone https://github.com/YOUR_USERNAME/codetyper.cli.git
   cd codetyper.cli
   ```
3. Install dependencies:
   ```bash
   bun install
   ```
4. Build the project:
   ```bash
   bun run build
   ```
5. Link for local testing:
   ```bash
   bun link
   ```

### Development Workflow

```bash
# Start development mode
bun run dev

# Watch mode with auto-rebuild
bun run dev:watch

# Run tests
bun test

# Type check
bun run typecheck

# Lint code
bun run lint

# Format code
bun run prettier
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
   bun test
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
├── api/              # API clients (Copilot, Ollama, Brain)
├── commands/         # CLI command implementations
├── constants/        # Centralized constants
├── interfaces/       # Interface definitions
├── prompts/          # System prompts and prompt templates
├── providers/        # LLM provider integrations
├── services/         # Business logic services
│   ├── core/         # Core agent and orchestration
│   ├── hooks/        # Lifecycle hooks
│   ├── plugin/       # Plugin management
│   └── session/      # Session management and forking
├── skills/           # Agent skill definitions
├── stores/           # Zustand state stores
├── tools/            # Agent tools (bash, read, write, edit, etc.)
├── tui-solid/        # Terminal UI (Solid.js + OpenTUI)
│   ├── components/   # Reusable UI components
│   ├── context/      # Solid.js context providers
│   ├── routes/       # TUI route components
│   └── ui/           # Base UI primitives
├── types/            # Type definitions
├── ui/               # Print-mode UI components
└── utils/            # Utility functions
```

### Testing

- Write tests for non-UI logic
- Place tests in `tests/` directory or colocate with source files
- Name test files `*.test.ts`
- Use descriptive test names
- Tests run with Vitest via `bun test`

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
| `src/services/core/agent.ts` | Agent loop, tool orchestration |
| `src/services/permissions/` | Permission system |
| `src/services/hooks/` | Lifecycle hooks |
| `src/services/plugin/` | Plugin management |
| `src/services/session/` | Session forking |
| `src/tui-solid/app.tsx` | Root TUI component (Solid.js) |
| `src/tui-solid/components/` | UI components |
| `src/stores/` | Zustand state management |
| `src/prompts/` | System prompt templates |
| `src/tools/` | Tool implementations |

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

1. Add binding to vim constants in `src/constants/`
2. Add action handler in the vim store (`src/stores/`)
3. Update documentation

## Questions?

- Open a GitHub issue for questions
- Tag with `question` label

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
