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
} from "@services/mcp/index";
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
  };

  const handler = handlers[subcommand];
  if (!handler) {
    console.log(chalk.yellow(`Unknown MCP command: ${subcommand}`));
    console.log(
      chalk.gray("Available: status, connect, disconnect, tools, add"),
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
