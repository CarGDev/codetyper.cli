/**
 * Handle MCP commands in chat
 */

import chalk from "chalk";
import {
  initializeMCP,
  connectServer,
  disconnectServer,
  connectAllServers,
  disconnectAllServers,
  getAllTools,
} from "@services/mcp/manager";
import {
  searchServers,
  getPopularServers,
  installServerById,
  getCategoriesWithCounts,
} from "@services/mcp/registry";
import {
  MCP_CATEGORY_LABELS,
  MCP_CATEGORY_ICONS,
} from "@constants/mcp-registry";
import { showMCPStatus } from "@commands/components/chat/mcp/show-mcp-status";
import { appStore } from "@tui-solid/context/app";

/**
 * Handle MCP subcommands
 */
export const handleMCP = async (args: string[]): Promise<void> => {
  const subcommand = args[0] || "status";

  const handlers: Record<string, (args: string[]) => Promise<void>> = {
    status: handleStatus,
    connect: handleConnect,
    disconnect: handleDisconnect,
    tools: handleTools,
    add: handleAdd,
    search: handleSearch,
    browse: handleBrowse,
    install: handleInstall,
    popular: handlePopular,
    categories: handleCategories,
  };

  const handler = handlers[subcommand];
  if (!handler) {
    console.log(chalk.yellow(`Unknown MCP command: ${subcommand}`));
    console.log(
      chalk.gray(
        "Available: status, connect, disconnect, tools, add, search, browse, install, popular, categories",
      ),
    );
    return;
  }

  await handler(args.slice(1));
};

/**
 * Show MCP status
 */
const handleStatus = async (_args: string[]): Promise<void> => {
  await showMCPStatus();
};

/**
 * Connect to MCP servers
 */
const handleConnect = async (args: string[]): Promise<void> => {
  await initializeMCP();

  const name = args[0];

  if (name) {
    try {
      console.log(chalk.gray(`Connecting to ${name}...`));
      const instance = await connectServer(name);
      console.log(chalk.green(`✓ Connected to ${name}`));
      console.log(chalk.gray(`  Tools: ${instance.tools.length}`));
    } catch (err) {
      console.log(chalk.red(`✗ Failed to connect: ${err}`));
    }
  } else {
    console.log(chalk.gray("Connecting to all servers..."));
    const results = await connectAllServers();

    for (const [serverName, instance] of results) {
      if (instance.state === "connected") {
        console.log(
          chalk.green(`✓ ${serverName}: ${instance.tools.length} tools`),
        );
      } else {
        console.log(
          chalk.red(`✗ ${serverName}: ${instance.error || "Failed"}`),
        );
      }
    }
  }
  console.log();
};

/**
 * Disconnect from MCP servers
 */
const handleDisconnect = async (args: string[]): Promise<void> => {
  const name = args[0];

  if (name) {
    await disconnectServer(name);
    console.log(chalk.green(`✓ Disconnected from ${name}`));
  } else {
    await disconnectAllServers();
    console.log(chalk.green("✓ Disconnected from all servers"));
  }
  console.log();
};

/**
 * List available MCP tools
 */
const handleTools = async (_args: string[]): Promise<void> => {
  await connectAllServers();
  const tools = getAllTools();

  if (tools.length === 0) {
    console.log(chalk.yellow("\nNo tools available."));
    console.log(chalk.gray("Connect to MCP servers first with /mcp connect"));
    console.log();
    return;
  }

  console.log(chalk.bold("\nMCP Tools\n"));

  // Group by server
  const byServer = new Map<string, typeof tools>();
  for (const item of tools) {
    const existing = byServer.get(item.server) || [];
    existing.push(item);
    byServer.set(item.server, existing);
  }

  for (const [server, serverTools] of byServer) {
    console.log(chalk.cyan(`${server}:`));
    for (const { tool } of serverTools) {
      console.log(`  ${chalk.white(tool.name)}`);
      if (tool.description) {
        console.log(`    ${chalk.gray(tool.description)}`);
      }
    }
    console.log();
  }
};

/**
 * Open the MCP add form
 */
const handleAdd = async (_args: string[]): Promise<void> => {
  appStore.setMode("mcp_add");
};

/**
 * Search for MCP servers
 */
const handleSearch = async (args: string[]): Promise<void> => {
  const query = args.join(" ");

  if (!query) {
    console.log(chalk.yellow("\nUsage: /mcp search <query>"));
    console.log(chalk.gray("Example: /mcp search database"));
    console.log(chalk.gray("Or use /mcp browse for interactive browser"));
    console.log();
    return;
  }

  console.log(chalk.gray(`\nSearching for "${query}"...`));

  try {
    const result = await searchServers({ query, limit: 10 });

    if (result.servers.length === 0) {
      console.log(chalk.yellow("\nNo servers found matching your search."));
      console.log(chalk.gray("Try /mcp popular to see popular servers"));
      console.log();
      return;
    }

    console.log(chalk.bold(`\nFound ${result.total} servers:\n`));

    for (const server of result.servers) {
      const icon = MCP_CATEGORY_ICONS[server.category];
      const verified = server.verified ? chalk.green(" ✓") : "";
      console.log(`${icon} ${chalk.white(server.name)}${verified}`);
      console.log(`   ${chalk.gray(server.description)}`);
      console.log(`   ${chalk.cyan("Install:")} /mcp install ${server.id}`);
      console.log();
    }
  } catch (error) {
    console.log(chalk.red(`\nSearch failed: ${error}`));
    console.log();
  }
};

/**
 * Open interactive MCP browser
 */
const handleBrowse = async (_args: string[]): Promise<void> => {
  appStore.setMode("mcp_browse");
};

/**
 * Install an MCP server by ID
 */
const handleInstall = async (args: string[]): Promise<void> => {
  const serverId = args[0];

  if (!serverId) {
    console.log(chalk.yellow("\nUsage: /mcp install <server-id>"));
    console.log(chalk.gray("Example: /mcp install sqlite"));
    console.log(chalk.gray("Use /mcp search to find server IDs"));
    console.log();
    return;
  }

  console.log(chalk.gray(`\nInstalling ${serverId}...`));

  try {
    const result = await installServerById(serverId, { connect: true });

    if (result.success) {
      console.log(chalk.green(`\n✓ Installed ${result.serverName}`));
      if (result.connected) {
        console.log(chalk.gray("  Server is now connected"));
      }
    } else {
      console.log(chalk.red(`\n✗ Installation failed: ${result.error}`));
    }
    console.log();
  } catch (error) {
    console.log(chalk.red(`\nInstallation failed: ${error}`));
    console.log();
  }
};

/**
 * Show popular MCP servers
 */
const handlePopular = async (_args: string[]): Promise<void> => {
  console.log(chalk.gray("\nFetching popular servers..."));

  try {
    const servers = await getPopularServers(10);

    console.log(chalk.bold("\nPopular MCP Servers:\n"));

    for (const server of servers) {
      const icon = MCP_CATEGORY_ICONS[server.category];
      const verified = server.verified ? chalk.green(" ✓") : "";
      console.log(`${icon} ${chalk.white(server.name)}${verified}`);
      console.log(`   ${chalk.gray(server.description)}`);
      console.log(`   ${chalk.cyan("Install:")} /mcp install ${server.id}`);
      console.log();
    }
  } catch (error) {
    console.log(chalk.red(`\nFailed to fetch servers: ${error}`));
    console.log();
  }
};

/**
 * Show MCP server categories
 */
const handleCategories = async (_args: string[]): Promise<void> => {
  console.log(chalk.gray("\nFetching categories..."));

  try {
    const categories = await getCategoriesWithCounts();

    console.log(chalk.bold("\nMCP Server Categories:\n"));

    for (const { category, count } of categories) {
      const icon = MCP_CATEGORY_ICONS[category];
      const label = MCP_CATEGORY_LABELS[category];
      console.log(
        `${icon} ${chalk.white(label)} ${chalk.gray(`(${count} servers)`)}`,
      );
    }

    console.log();
    console.log(chalk.gray("Use /mcp search <category> to filter by category"));
    console.log();
  } catch (error) {
    console.log(chalk.red(`\nFailed to fetch categories: ${error}`));
    console.log();
  }
};
