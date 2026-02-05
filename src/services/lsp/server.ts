/**
 * LSP Server Definitions
 *
 * Defines how to find and spawn language servers
 */

import { spawn, execSync, type ChildProcess } from "child_process";
import path from "path";
import fs from "fs/promises";

export interface ServerHandle {
  process: ChildProcess;
  capabilities?: Record<string, unknown>;
}

export interface ServerInfo {
  id: string;
  name: string;
  extensions: string[];
  rootPatterns: string[];
  command: string;
  args?: string[];
  env?: Record<string, string>;
}

const fileExists = async (filePath: string): Promise<boolean> => {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
};

const findProjectRoot = async (
  startDir: string,
  patterns: string[],
): Promise<string | null> => {
  let currentDir = startDir;
  const root = path.parse(currentDir).root;

  while (currentDir !== root) {
    for (const pattern of patterns) {
      const checkPath = path.join(currentDir, pattern);
      if (await fileExists(checkPath)) {
        return currentDir;
      }
    }
    currentDir = path.dirname(currentDir);
  }

  return null;
};

const findBinary = async (name: string): Promise<string | null> => {
  try {
    const command =
      process.platform === "win32" ? `where ${name}` : `which ${name}`;
    const result = execSync(command, {
      encoding: "utf-8",
      stdio: ["pipe", "pipe", "pipe"],
    });
    return result.trim().split("\n")[0] || null;
  } catch {
    return null;
  }
};

export const SERVERS: Record<string, ServerInfo> = {
  typescript: {
    id: "typescript",
    name: "TypeScript Language Server",
    extensions: [".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs"],
    rootPatterns: ["package.json", "tsconfig.json", "jsconfig.json"],
    command: "typescript-language-server",
    args: ["--stdio"],
  },
  deno: {
    id: "deno",
    name: "Deno Language Server",
    extensions: [".ts", ".tsx", ".js", ".jsx"],
    rootPatterns: ["deno.json", "deno.jsonc"],
    command: "deno",
    args: ["lsp"],
  },
  python: {
    id: "python",
    name: "Pyright",
    extensions: [".py", ".pyi"],
    rootPatterns: [
      "pyproject.toml",
      "setup.py",
      "requirements.txt",
      "pyrightconfig.json",
    ],
    command: "pyright-langserver",
    args: ["--stdio"],
  },
  gopls: {
    id: "gopls",
    name: "Go Language Server",
    extensions: [".go"],
    rootPatterns: ["go.mod", "go.work"],
    command: "gopls",
    args: ["serve"],
  },
  rust: {
    id: "rust-analyzer",
    name: "Rust Analyzer",
    extensions: [".rs"],
    rootPatterns: ["Cargo.toml"],
    command: "rust-analyzer",
  },
  clangd: {
    id: "clangd",
    name: "Clangd",
    extensions: [".c", ".cpp", ".h", ".hpp", ".cc", ".cxx"],
    rootPatterns: ["compile_commands.json", "CMakeLists.txt", ".clangd"],
    command: "clangd",
  },
  lua: {
    id: "lua-language-server",
    name: "Lua Language Server",
    extensions: [".lua"],
    rootPatterns: [".luarc.json", ".luarc.jsonc"],
    command: "lua-language-server",
  },
  bash: {
    id: "bash-language-server",
    name: "Bash Language Server",
    extensions: [".sh", ".bash", ".zsh"],
    rootPatterns: [".bashrc", ".zshrc"],
    command: "bash-language-server",
    args: ["start"],
  },
  yaml: {
    id: "yaml-language-server",
    name: "YAML Language Server",
    extensions: [".yaml", ".yml"],
    rootPatterns: [".yamllint", ".yaml-lint.yml"],
    command: "yaml-language-server",
    args: ["--stdio"],
  },
  json: {
    id: "vscode-json-language-server",
    name: "JSON Language Server",
    extensions: [".json", ".jsonc"],
    rootPatterns: ["package.json", "tsconfig.json"],
    command: "vscode-json-language-server",
    args: ["--stdio"],
  },
  html: {
    id: "vscode-html-language-server",
    name: "HTML Language Server",
    extensions: [".html", ".htm"],
    rootPatterns: ["package.json", "index.html"],
    command: "vscode-html-language-server",
    args: ["--stdio"],
  },
  css: {
    id: "vscode-css-language-server",
    name: "CSS Language Server",
    extensions: [".css", ".scss", ".less"],
    rootPatterns: ["package.json"],
    command: "vscode-css-language-server",
    args: ["--stdio"],
  },
  eslint: {
    id: "eslint",
    name: "ESLint Language Server",
    extensions: [".ts", ".tsx", ".js", ".jsx"],
    rootPatterns: [
      ".eslintrc",
      ".eslintrc.js",
      ".eslintrc.json",
      "eslint.config.js",
    ],
    command: "vscode-eslint-language-server",
    args: ["--stdio"],
  },
  svelte: {
    id: "svelte-language-server",
    name: "Svelte Language Server",
    extensions: [".svelte"],
    rootPatterns: ["svelte.config.js", "svelte.config.ts"],
    command: "svelteserver",
    args: ["--stdio"],
  },
  vue: {
    id: "vue-language-server",
    name: "Vue Language Server",
    extensions: [".vue"],
    rootPatterns: ["vue.config.js", "vite.config.ts", "nuxt.config.ts"],
    command: "vue-language-server",
    args: ["--stdio"],
  },
  prisma: {
    id: "prisma-language-server",
    name: "Prisma Language Server",
    extensions: [".prisma"],
    rootPatterns: ["schema.prisma"],
    command: "prisma-language-server",
    args: ["--stdio"],
  },
  terraform: {
    id: "terraform-ls",
    name: "Terraform Language Server",
    extensions: [".tf", ".tfvars"],
    rootPatterns: [".terraform", "main.tf"],
    command: "terraform-ls",
    args: ["serve"],
  },
  docker: {
    id: "docker-langserver",
    name: "Dockerfile Language Server",
    extensions: [".dockerfile"],
    rootPatterns: ["Dockerfile", "docker-compose.yml"],
    command: "docker-langserver",
    args: ["--stdio"],
  },
};

export const getServersForFile = (filePath: string): ServerInfo[] => {
  const ext = "." + (filePath.split(".").pop() ?? "");
  const fileName = path.basename(filePath);

  return Object.values(SERVERS).filter((server) => {
    return (
      server.extensions.includes(ext) || server.extensions.includes(fileName)
    );
  });
};

export const findRootForServer = async (
  filePath: string,
  server: ServerInfo,
): Promise<string | null> => {
  const dir = path.dirname(filePath);
  return findProjectRoot(dir, server.rootPatterns);
};

export const spawnServer = async (
  server: ServerInfo,
  root: string,
): Promise<ServerHandle | null> => {
  const binary = await findBinary(server.command);

  if (!binary) {
    return null;
  }

  const proc = spawn(binary, server.args ?? [], {
    cwd: root,
    env: { ...process.env, ...server.env },
    stdio: ["pipe", "pipe", "pipe"],
  });

  if (!proc.pid) {
    return null;
  }

  return { process: proc };
};

export const isServerAvailable = async (
  server: ServerInfo,
): Promise<boolean> => {
  const binary = await findBinary(server.command);
  return binary !== null;
};

export const getAvailableServers = async (): Promise<ServerInfo[]> => {
  const available: ServerInfo[] = [];

  for (const server of Object.values(SERVERS)) {
    if (await isServerAvailable(server)) {
      available.push(server);
    }
  }

  return available;
};
