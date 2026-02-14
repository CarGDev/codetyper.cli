# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- **Pink Purple Theme**: New built-in theme with hot pink primary, purple secondary, and deep magenta accent on a dark plum background
- **Activity Panel Toggle**: `Ctrl+O` keybind to show/hide the activity panel (context/tokens, modified files)

### Fixed

- **Image Paste Race Condition**: Fixed images being silently dropped when pasting via Ctrl+V. The `clearPastedImages()` call in the input area was racing with the async message handler, clearing images before they could be read and attached to the message
- **@ File Picker**: Now works at any cursor position in the input, not just when the input is empty
- **/ Command Menu**: Now works at any cursor position in the input, not just when the input is empty
- **Terminal Garbage on Exit**: Fixed `997;1n` text appearing on exit, caused by unanswered DECRQM mode 997 query from the TUI renderer

### Planned

- **Diff Preview**: Show file changes before writing ([#112](https://github.com/CarGDev/codetyper.cli/issues/112))
- **Model Consistency**: Ensure consistent behavior across LLM providers ([#114](https://github.com/CarGDev/codetyper.cli/issues/114))
- **Quality Gates**: Run TypeScript, lint, and tests before task completion ([#115](https://github.com/CarGDev/codetyper.cli/issues/115))

---

## [0.4.0] - 2026-02-06

### Added

- **Text Clipboard Copy/Read**: Cross-platform text clipboard operations
  - macOS (`osascript`/`pbpaste`), Linux (`wl-copy`/`xclip`/`xsel`), Windows (PowerShell)
  - OSC 52 escape sequence support for SSH/tmux environments
  - Mouse selection auto-copies to system clipboard via `onMouseUp`
  - `Ctrl+Y` keyboard shortcut for copy-selection
  - Unified `readClipboard()` returning text or image with MIME type
  - Shared `runCommand` helpers extracted from clipboard-service

- **Plan Approval Gate**: User confirmation before agent executes plans
  - Plan approval modal with keyboard navigation
  - Multiple approval modes: auto-accept, manual approve, feedback
  - Inline permission prompt for plan execution

- **Execution Control**: Pause, resume, and abort agent execution
  - `Ctrl+P` to toggle pause/resume during execution
  - `Ctrl+Z` to abort with rollback
  - `Ctrl+Shift+S` to toggle step-by-step mode
  - Enter to advance step when waiting for confirmation

- **Parallel Agent Execution**: Unified agent registry with concurrent task support

- **Thinking Tag Parser**: Parse and display reasoning/thinking tags from LLM responses

### Changed

- **Inline Permission Prompt**: Improved TUI layout for permission prompts
- **Clipboard Service Refactored**: Extracted shared `runCommand` into `@services/clipboard/run-command`

### Security

- **Sensitive File Protection**: Auto-backup before modifying sensitive files (`.env`, credentials, etc.)
- **Dangerous Command Blocking**: Block destructive bash commands (`rm -rf`, `sudo`, etc.)

### Fixed

- Rollback now correctly extracts file path from tool arguments
- Permission handling improvements

---

## [0.3.0] - 2025-02-04

### Added

- **System Prompt Builder**: New modular prompt system with modes, tiers, and providers
  - Separate prompt templates for different agent modes
  - Provider-specific prompt optimizations
  - Tier-based prompt complexity (basic, standard, advanced)

### Changed

- **Restructured `src/` Modules**: Consistent internal organization across all modules
  - Deleted legacy `index.ts` barrel exports
  - Improved import paths with path aliases
  - Better separation of concerns

### Removed

- **Legacy React/Ink TUI**: Removed old TUI implementation
  - Migrated fully to Solid.js + OpenTUI
  - Fixed TypeScript errors from removal

### Fixed

- Import paths in utils folder
- MCP initialization issues

---

## [0.2.4] - 2025-02-01

### Fixed

- MCP server connection stability improvements
- Various MCP-related bug fixes

---

## [0.2.3] - 2025-01-31

### Fixed

- MCP form input handling for server configuration
- Reactive MCP server state updates
- MCP server issues and stability

### Added

- `BRAIN_DISABLED` flag for disabling Brain API integration
- Ollama tool call formatting improvements

---

## [0.2.2] - 2025-01-30

### Fixed

- App store initialization issue
- General stability improvements

---

## [0.2.1] - 2025-01-29

### Added

- **MCP Server Searcher**: Browse and discover MCP servers
  - Interactive browser with `/mcp browse`
  - Search servers with `/mcp search <query>`
  - Filter by category (database, web, AI, dev-tools, etc.)
  - View server details and required environment variables
  - One-click install with `/mcp install <id>`
  - 15+ curated verified servers from Anthropic
  - Popular servers list with `/mcp popular`
  - Category listing with `/mcp categories`

---

## [0.2.0] - 2025-01-28

### Added

- **Hooks System**: Lifecycle hooks for extensibility
  - 6 hook events: PreToolUse, PostToolUse, SessionStart, SessionEnd, UserPromptSubmit, Stop
  - Exit code control flow (0=allow, 1=warn, 2=block)
  - JSON input/output via stdin/stdout
  - Modified arguments via `updatedInput`
  - Global + local configuration support
  - Configurable timeout per hook

- **Plugin System**: Custom tools, commands, and hooks
  - Plugin manifest with version and capabilities
  - Custom tool definitions via TypeScript
  - Custom slash commands via Markdown with frontmatter
  - Plugin-specific hooks
  - Global (~/.config/codetyper/plugins/) + local (.codetyper/plugins/)
  - Dynamic tool/command registration

- **Session Forking/Rewind**: Branch and time-travel session history
  - Named snapshots at any point in conversation
  - Rewind to any snapshot by name or index
  - Fork branches from any snapshot
  - Switch between forks
  - Suggested commit messages based on session content
  - Commands: /snapshot, /rewind, /fork, /forks, /switch

- **Vim Motions**: Vim-style keyboard navigation
  - 4 modes: Normal, Insert, Command, Visual
  - Scroll navigation (j/k, gg/G, Ctrl+d/u)
  - Search with highlighting (/, n/N)
  - Command mode (:q, :w, :wq, :nohl)
  - Mode indicator in status line
  - Configurable via settings.json

---

## [0.1.80] - 2025-01-27

### Fixed

- Prompt template issues
- Agent response formatting

---

## [0.1.79] - 2025-01-26

### Changed

- Version bump with minor fixes

---

## [0.1.78] - 2025-01-25

### Changed

- **Improved Agent Autonomy**: Better task execution flow
- **Enhanced Diff View**: Improved readability for file changes
  - Better color contrast
  - Clearer line indicators

---

## [0.1.77] - 2025-01-24

### Added

- **Debug Log Panel**: View internal logs for troubleshooting
- **Centered Modals**: Improved modal positioning and appearance

### Fixed

- Multiple UX issues
- Modal positioning on different terminal sizes
- Input focus handling

---

## [0.1.76] - 2025-01-23

### Fixed

- Installation issues with npm link
- Package distribution problems

---

## [0.1.75] - 2025-01-22

### Fixed

- Repository URL in package.json
- Package metadata corrections

---

## [0.1.0] - 2025-01-16

### Added

- **Interactive TUI**: Full terminal UI using Solid.js + OpenTUI
  - Message-based input (Enter to send, Shift+Enter for newlines)
  - Log panel showing conversation history
  - Status bar with session info
  - ASCII banner header

- **Permission System**: Granular control over tool execution
  - Interactive permission modal with keyboard navigation
  - Scoped permissions: once, session, project, global
  - Pattern-based matching: `Bash(command:args)`, `Read(*)`, `Write(path)`, `Edit(*.ext)`
  - Persistent storage in `~/.codetyper/settings.json` and `.codetyper/settings.json`

- **Agent System**: Autonomous task execution
  - Multi-turn conversation with tool calls
  - Automatic retry with exponential backoff for rate limits
  - Configurable max iterations

- **Tools**:
  - `bash` - Execute shell commands
  - `read` - Read file contents
  - `write` - Create or overwrite files
  - `edit` - Find and replace in files
  - `glob` - Find files by pattern
  - `grep` - Search file contents

- **Provider Support**:
  - GitHub Copilot (default) - OAuth device flow authentication
  - Ollama - Local server (no auth)

- **Cascading Provider System**: Intelligent routing between providers
  - Quality scoring per task type
  - Automatic provider selection based on performance

- **Session Management**:
  - Persistent session storage
  - Continue previous sessions with `--continue`
  - Resume specific sessions with `--resume <id>`

- **CLI Commands**:
  - `codetyper` - Start interactive TUI
  - `codetyper <prompt>` - Start with initial prompt
  - `codetyper login <provider>` - Authenticate with provider
  - `codetyper status` - Show provider status

- **Theme System**: 14+ built-in color themes
- **Todo Panel**: Task tracking with `Ctrl+T`
- **Home Screen**: Welcome screen with version info

---

## Version History Summary

| Version | Date               | Highlights                                                             |
| ------- | ------------------ | ---------------------------------------------------------------------- |
| 0.4.0   | 2026-02-06         | Clipboard copy/read, plan approval, execution control, safety features |
| 0.3.0   | 2025-02-04         | System prompt builder, module restructure, legacy TUI removal          |
| 0.2.x   | 2025-01-28 - 02-01 | Hooks, plugins, session forks, vim motions, MCP browser                |
| 0.1.x   | 2025-01-16 - 01-27 | Initial release, TUI, agent system, providers, permissions             |

---

[Unreleased]: https://github.com/CarGDev/codetyper.cli/compare/v0.4.0...HEAD
[0.4.0]: https://github.com/CarGDev/codetyper.cli/compare/v0.3.0...v0.4.0
[0.3.0]: https://github.com/CarGDev/codetyper.cli/compare/v0.2.4...v0.3.0
[0.2.4]: https://github.com/CarGDev/codetyper.cli/compare/v0.2.3...v0.2.4
[0.2.3]: https://github.com/CarGDev/codetyper.cli/compare/v0.2.2...v0.2.3
[0.2.2]: https://github.com/CarGDev/codetyper.cli/compare/v0.2.1...v0.2.2
[0.2.1]: https://github.com/CarGDev/codetyper.cli/compare/v0.2.0...v0.2.1
[0.2.0]: https://github.com/CarGDev/codetyper.cli/compare/v0.1.80...v0.2.0
[0.1.80]: https://github.com/CarGDev/codetyper.cli/compare/v0.1.79...v0.1.80
[0.1.79]: https://github.com/CarGDev/codetyper.cli/compare/v0.1.78...v0.1.79
[0.1.78]: https://github.com/CarGDev/codetyper.cli/compare/v0.1.77...v0.1.78
[0.1.77]: https://github.com/CarGDev/codetyper.cli/compare/v0.1.76...v0.1.77
[0.1.76]: https://github.com/CarGDev/codetyper.cli/compare/v0.1.75...v0.1.76
[0.1.75]: https://github.com/CarGDev/codetyper.cli/compare/v0.1.0...v0.1.75
[0.1.0]: https://github.com/CarGDev/codetyper.cli/releases/tag/v0.1.0
