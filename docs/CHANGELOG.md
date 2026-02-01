# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

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

- **Home Screen**: New welcome screen with centered gradient logo
  - Displays version, provider, and model info
  - Transitions to session view on first message
  - Clean, centered layout

- **MCP Integration**: Model Context Protocol server support
  - Connect to external MCP servers
  - Use tools from connected servers
  - `/mcp` command for server management
  - Status display in UI
  - **MCP Server Browser**: Search and discover MCP servers
    - Interactive browser with `/mcp browse`
    - Search servers with `/mcp search <query>`
    - Filter by category (database, web, AI, dev-tools, etc.)
    - View server details and required environment variables
    - One-click install with `/mcp install <id>`
    - 15+ curated verified servers from Anthropic
    - Registry integration with Smithery

- **Reasoning System**: Advanced agent orchestration
  - Memory selection for context optimization
  - Quality evaluation of responses
  - Termination detection for agent loops
  - Context compression for long conversations
  - Retry policies with exponential backoff

- **Todo Panel**: Task tracking during sessions
  - Toggle visibility with `Ctrl+T`
  - `todo-read` and `todo-write` tools
  - Zustand-based state management

- **Theme System**: Customizable color themes
  - `/theme` command to switch themes
  - Dark, Light, Tokyo Night, Dracula themes
  - Persistent theme preference

- **Agent Selection**: Switch between agent modes
  - `/agent` command for selection
  - Coder, Architect, Reviewer agents

- **Learning System**: Knowledge persistence
  - Vector store for embeddings
  - Semantic search capabilities
  - Project learnings storage

- **Streaming Responses**: Real-time message display
  - Faster feedback from LLM
  - Progress indicators

- **Enhanced Navigation**:
  - `PageUp/PageDown` for fast scrolling
  - `Shift+Up/Down` for line-by-line scroll
  - `Ctrl+Home/End` to jump to top/bottom

- **Optimized Permissions**: Performance improvements
  - Pattern caching
  - Indexed pattern matching
  - Faster permission checks

- **Auto-Compaction**: Context management
  - Automatic conversation compression
  - Maintains context within limits

### Changed

- Improved session header with token count and context percentage
- Enhanced status bar with MCP connection info
- Better command menu with more commands

## [0.1.0] - 2025-01-16

### Added

- **Interactive TUI**: Full terminal UI using Ink (React for CLIs)
  - Message-based input (Enter to send, Alt+Enter for newlines)
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

- **Provider Support**:
  - GitHub Copilot (default) - OAuth device flow authentication, access to GPT-4o, GPT-5, Claude, Gemini via Copilot API
  - Ollama - Local server (no auth), run any local model

- **Session Management**:
  - Persistent session storage
  - Continue previous sessions with `--continue`
  - Resume specific sessions with `--resume <id>`

- **CLI Commands**:
  - `codetyper` - Start interactive TUI
  - `codetyper <prompt>` - Start with initial prompt
  - `codetyper login <provider>` - Authenticate with provider
  - `codetyper status` - Show provider status
  - `codetyper config` - Manage configuration

### Changed

- Migrated from readline-based input to Ink TUI
- Removed classic mode in favor of TUI-only interface
- Tool output now captured and displayed in log panel (not streamed to stdout)

### Fixed

- Permission modal not showing in TUI mode
- Input area blocking during command execution
- Rate limit handling for Copilot provider (429 errors)

---

## Version History

- **0.1.0** - Initial release with TUI, agent system, and multi-provider support
