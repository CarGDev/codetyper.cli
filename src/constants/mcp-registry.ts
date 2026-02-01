/**
 * MCP Registry Constants
 *
 * Constants for MCP server discovery and search
 */

import type { MCPServerCategory, MCPRegistryServer } from "@/types/mcp-registry";

/**
 * Default registry sources
 */
export const MCP_REGISTRY_SOURCES = {
  /** Official MCP servers GitHub */
  OFFICIAL: "https://raw.githubusercontent.com/modelcontextprotocol/servers/main/README.md",
  /** Smithery registry API */
  SMITHERY: "https://registry.smithery.ai/servers",
} as const;

/**
 * Cache settings
 */
export const MCP_REGISTRY_CACHE = {
  /** Cache duration in milliseconds (1 hour) */
  DURATION_MS: 60 * 60 * 1000,
  /** Cache file name */
  FILE_NAME: "mcp-registry-cache.json",
} as const;

/**
 * Category display names
 */
export const MCP_CATEGORY_LABELS: Record<MCPServerCategory, string> = {
  database: "Database",
  filesystem: "File System",
  web: "Web & Browser",
  ai: "AI & ML",
  "dev-tools": "Developer Tools",
  productivity: "Productivity",
  communication: "Communication",
  cloud: "Cloud Services",
  security: "Security",
  other: "Other",
} as const;

/**
 * Category icons (emoji)
 */
export const MCP_CATEGORY_ICONS: Record<MCPServerCategory, string> = {
  database: "🗄️",
  filesystem: "📁",
  web: "🌐",
  ai: "🤖",
  "dev-tools": "🛠️",
  productivity: "📋",
  communication: "💬",
  cloud: "☁️",
  security: "🔒",
  other: "📦",
} as const;

/**
 * Search defaults
 */
export const MCP_SEARCH_DEFAULTS = {
  LIMIT: 20,
  SORT_BY: "popularity" as const,
} as const;

/**
 * Built-in curated server list
 * These are well-known, verified MCP servers
 */
export const MCP_CURATED_SERVERS: MCPRegistryServer[] = [
  {
    id: "filesystem",
    name: "Filesystem",
    description: "Read, write, and manage files on the local filesystem",
    author: "Anthropic",
    repository: "https://github.com/modelcontextprotocol/servers",
    package: "@modelcontextprotocol/server-filesystem",
    command: "npx",
    args: ["-y", "@modelcontextprotocol/server-filesystem", "/path/to/dir"],
    category: "filesystem",
    tags: ["files", "read", "write", "directory"],
    transport: "stdio",
    version: "latest",
    popularity: 100,
    verified: true,
    installHint: "Replace /path/to/dir with the directory you want to access",
    updatedAt: "2024-12-01",
  },
  {
    id: "sqlite",
    name: "SQLite",
    description: "Query and manage SQLite databases",
    author: "Anthropic",
    repository: "https://github.com/modelcontextprotocol/servers",
    package: "@modelcontextprotocol/server-sqlite",
    command: "npx",
    args: ["-y", "@modelcontextprotocol/server-sqlite", "/path/to/db.sqlite"],
    category: "database",
    tags: ["sql", "database", "query", "sqlite"],
    transport: "stdio",
    version: "latest",
    popularity: 95,
    verified: true,
    installHint: "Replace /path/to/db.sqlite with your database file path",
    updatedAt: "2024-12-01",
  },
  {
    id: "postgres",
    name: "PostgreSQL",
    description: "Connect to and query PostgreSQL databases",
    author: "Anthropic",
    repository: "https://github.com/modelcontextprotocol/servers",
    package: "@modelcontextprotocol/server-postgres",
    command: "npx",
    args: ["-y", "@modelcontextprotocol/server-postgres"],
    category: "database",
    tags: ["sql", "database", "query", "postgres", "postgresql"],
    transport: "stdio",
    version: "latest",
    popularity: 90,
    verified: true,
    envVars: ["POSTGRES_CONNECTION_STRING"],
    installHint: "Set POSTGRES_CONNECTION_STRING environment variable",
    updatedAt: "2024-12-01",
  },
  {
    id: "github",
    name: "GitHub",
    description: "Interact with GitHub repositories, issues, and pull requests",
    author: "Anthropic",
    repository: "https://github.com/modelcontextprotocol/servers",
    package: "@modelcontextprotocol/server-github",
    command: "npx",
    args: ["-y", "@modelcontextprotocol/server-github"],
    category: "dev-tools",
    tags: ["github", "git", "repository", "issues", "pr"],
    transport: "stdio",
    version: "latest",
    popularity: 92,
    verified: true,
    envVars: ["GITHUB_PERSONAL_ACCESS_TOKEN"],
    installHint: "Set GITHUB_PERSONAL_ACCESS_TOKEN environment variable",
    updatedAt: "2024-12-01",
  },
  {
    id: "gitlab",
    name: "GitLab",
    description: "Interact with GitLab repositories and CI/CD",
    author: "Anthropic",
    repository: "https://github.com/modelcontextprotocol/servers",
    package: "@modelcontextprotocol/server-gitlab",
    command: "npx",
    args: ["-y", "@modelcontextprotocol/server-gitlab"],
    category: "dev-tools",
    tags: ["gitlab", "git", "repository", "ci", "cd"],
    transport: "stdio",
    version: "latest",
    popularity: 75,
    verified: true,
    envVars: ["GITLAB_PERSONAL_ACCESS_TOKEN", "GITLAB_API_URL"],
    installHint: "Set GITLAB_PERSONAL_ACCESS_TOKEN and optionally GITLAB_API_URL",
    updatedAt: "2024-12-01",
  },
  {
    id: "slack",
    name: "Slack",
    description: "Send messages and interact with Slack workspaces",
    author: "Anthropic",
    repository: "https://github.com/modelcontextprotocol/servers",
    package: "@modelcontextprotocol/server-slack",
    command: "npx",
    args: ["-y", "@modelcontextprotocol/server-slack"],
    category: "communication",
    tags: ["slack", "messaging", "chat", "team"],
    transport: "stdio",
    version: "latest",
    popularity: 80,
    verified: true,
    envVars: ["SLACK_BOT_TOKEN", "SLACK_TEAM_ID"],
    installHint: "Set SLACK_BOT_TOKEN and SLACK_TEAM_ID environment variables",
    updatedAt: "2024-12-01",
  },
  {
    id: "google-drive",
    name: "Google Drive",
    description: "Access and manage files in Google Drive",
    author: "Anthropic",
    repository: "https://github.com/modelcontextprotocol/servers",
    package: "@modelcontextprotocol/server-gdrive",
    command: "npx",
    args: ["-y", "@modelcontextprotocol/server-gdrive"],
    category: "cloud",
    tags: ["google", "drive", "cloud", "storage", "files"],
    transport: "stdio",
    version: "latest",
    popularity: 78,
    verified: true,
    installHint: "Requires Google OAuth credentials setup",
    updatedAt: "2024-12-01",
  },
  {
    id: "memory",
    name: "Memory",
    description: "Persistent memory and knowledge graph for context",
    author: "Anthropic",
    repository: "https://github.com/modelcontextprotocol/servers",
    package: "@modelcontextprotocol/server-memory",
    command: "npx",
    args: ["-y", "@modelcontextprotocol/server-memory"],
    category: "ai",
    tags: ["memory", "knowledge", "graph", "context", "persistent"],
    transport: "stdio",
    version: "latest",
    popularity: 85,
    verified: true,
    updatedAt: "2024-12-01",
  },
  {
    id: "brave-search",
    name: "Brave Search",
    description: "Search the web using Brave Search API",
    author: "Anthropic",
    repository: "https://github.com/modelcontextprotocol/servers",
    package: "@modelcontextprotocol/server-brave-search",
    command: "npx",
    args: ["-y", "@modelcontextprotocol/server-brave-search"],
    category: "web",
    tags: ["search", "web", "brave", "internet"],
    transport: "stdio",
    version: "latest",
    popularity: 82,
    verified: true,
    envVars: ["BRAVE_API_KEY"],
    installHint: "Set BRAVE_API_KEY environment variable",
    updatedAt: "2024-12-01",
  },
  {
    id: "puppeteer",
    name: "Puppeteer",
    description: "Browser automation and web scraping with Puppeteer",
    author: "Anthropic",
    repository: "https://github.com/modelcontextprotocol/servers",
    package: "@modelcontextprotocol/server-puppeteer",
    command: "npx",
    args: ["-y", "@modelcontextprotocol/server-puppeteer"],
    category: "web",
    tags: ["browser", "automation", "scraping", "puppeteer", "chrome"],
    transport: "stdio",
    version: "latest",
    popularity: 76,
    verified: true,
    updatedAt: "2024-12-01",
  },
  {
    id: "fetch",
    name: "Fetch",
    description: "Make HTTP requests and fetch web content",
    author: "Anthropic",
    repository: "https://github.com/modelcontextprotocol/servers",
    package: "@modelcontextprotocol/server-fetch",
    command: "npx",
    args: ["-y", "@modelcontextprotocol/server-fetch"],
    category: "web",
    tags: ["http", "fetch", "api", "request", "web"],
    transport: "stdio",
    version: "latest",
    popularity: 88,
    verified: true,
    updatedAt: "2024-12-01",
  },
  {
    id: "sequential-thinking",
    name: "Sequential Thinking",
    description: "Step-by-step reasoning and problem-solving",
    author: "Anthropic",
    repository: "https://github.com/modelcontextprotocol/servers",
    package: "@modelcontextprotocol/server-sequential-thinking",
    command: "npx",
    args: ["-y", "@modelcontextprotocol/server-sequential-thinking"],
    category: "ai",
    tags: ["thinking", "reasoning", "chain-of-thought", "problem-solving"],
    transport: "stdio",
    version: "latest",
    popularity: 70,
    verified: true,
    updatedAt: "2024-12-01",
  },
  {
    id: "everart",
    name: "EverArt",
    description: "AI image generation with EverArt",
    author: "Anthropic",
    repository: "https://github.com/modelcontextprotocol/servers",
    package: "@modelcontextprotocol/server-everart",
    command: "npx",
    args: ["-y", "@modelcontextprotocol/server-everart"],
    category: "ai",
    tags: ["image", "generation", "ai", "art", "creative"],
    transport: "stdio",
    version: "latest",
    popularity: 65,
    verified: true,
    envVars: ["EVERART_API_KEY"],
    installHint: "Set EVERART_API_KEY environment variable",
    updatedAt: "2024-12-01",
  },
  {
    id: "sentry",
    name: "Sentry",
    description: "Access Sentry error tracking and monitoring",
    author: "Anthropic",
    repository: "https://github.com/modelcontextprotocol/servers",
    package: "@modelcontextprotocol/server-sentry",
    command: "npx",
    args: ["-y", "@modelcontextprotocol/server-sentry"],
    category: "dev-tools",
    tags: ["sentry", "errors", "monitoring", "debugging"],
    transport: "stdio",
    version: "latest",
    popularity: 72,
    verified: true,
    envVars: ["SENTRY_AUTH_TOKEN", "SENTRY_ORG"],
    installHint: "Set SENTRY_AUTH_TOKEN and SENTRY_ORG environment variables",
    updatedAt: "2024-12-01",
  },
  {
    id: "aws-kb-retrieval",
    name: "AWS Knowledge Base",
    description: "Retrieve information from AWS Bedrock Knowledge Bases",
    author: "Anthropic",
    repository: "https://github.com/modelcontextprotocol/servers",
    package: "@modelcontextprotocol/server-aws-kb-retrieval",
    command: "npx",
    args: ["-y", "@modelcontextprotocol/server-aws-kb-retrieval"],
    category: "cloud",
    tags: ["aws", "bedrock", "knowledge-base", "retrieval", "rag"],
    transport: "stdio",
    version: "latest",
    popularity: 68,
    verified: true,
    envVars: ["AWS_ACCESS_KEY_ID", "AWS_SECRET_ACCESS_KEY", "AWS_REGION"],
    installHint: "Set AWS credentials environment variables",
    updatedAt: "2024-12-01",
  },
];

/**
 * Error messages
 */
export const MCP_REGISTRY_ERRORS = {
  FETCH_FAILED: "Failed to fetch MCP registry",
  PARSE_FAILED: "Failed to parse registry data",
  NOT_FOUND: "No servers found matching your search",
  INSTALL_FAILED: "Failed to install MCP server",
  ALREADY_INSTALLED: "Server is already installed",
} as const;

/**
 * Success messages
 */
export const MCP_REGISTRY_SUCCESS = {
  INSTALLED: "MCP server installed successfully",
  CONNECTED: "MCP server connected",
  CACHE_UPDATED: "Registry cache updated",
} as const;
