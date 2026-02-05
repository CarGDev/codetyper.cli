/**
 * MCP Command - Manage MCP servers
 *
 * Usage:
 *   codetyper mcp list              - List configured servers
 *   codetyper mcp add <name>        - Add a new server
 *   codetyper mcp remove <name>     - Remove a server
 *   codetyper mcp connect [name]    - Connect to server(s)
 *   codetyper mcp disconnect [name] - Disconnect from server(s)
 *   codetyper mcp status            - Show connection status
 *   codetyper mcp tools             - List available tools
 */

import chalk from "chalk";
import {
  errorMessage,
  infoMessage,
  successMessage,
} from "@utils/core/terminal";
import {
  initializeMCP,
  getMCPConfig,
  addServer,
  removeServer,
  connectServer,
  disconnectServer,
  connectAllServers,
  disconnectAllServers,
  getServerInstances,
  getAllTools,
} from "@services/mcp/manager";

/**
 * MCP command handler
 */
export const mcpCommand = async (args: string[]): Promise<void> => {
  const subcommand = args[0] || "status";

  const handlers: Record<string, (args: string[]) => Promise<void>> = {
    list: handleList,
    add: handleAdd,
    remove: handleRemove,
    connect: handleConnect,
    disconnect: handleDisconnect,
    status: handleStatus,
    tools: handleTools,
    help: handleHelp,
  };

  const handler = handlers[subcommand];
  if (!handler) {
    errorMessage(`Unknown subcommand: ${subcommand}`);
    await handleHelp([]);
    return;
  }

  await handler(args.slice(1));
};

/**
 * List configured servers
 */
const handleList = async (_args: string[]): Promise<void> => {
  await initializeMCP();
  const config = await getMCPConfig();

  const servers = Object.entries(config.servers);
  if (servers.length === 0) {
    infoMessage("No MCP servers configured.");
    infoMessage("Add a server with: codetyper mcp add <name>");
    return;
  }

  console.log(chalk.bold("\nConfigured MCP Servers:\n"));

  for (const [name, server] of servers) {
    const enabled =
      server.enabled !== false ? chalk.green("✓") : chalk.gray("○");
    console.log(`  ${enabled} ${chalk.cyan(name)}`);
    console.log(
      `    Command: ${server.command} ${(server.args || []).join(" ")}`,
    );
    if (server.transport && server.transport !== "stdio") {
      console.log(`    Transport: ${server.transport}`);
    }
    console.log();
  }
};

/**
 * Add a new server
 */
const handleAdd = async (args: string[]): Promise<void> => {
  const name = args[0];
  if (!name) {
    errorMessage("Server name required");
    infoMessage(
      "Usage: codetyper mcp add <name> --command <cmd> [--args <args>]",
    );
    return;
  }

  // Parse options
  let command = "";
  const serverArgs: string[] = [];
  let isGlobal = false;

  for (let i = 1; i < args.length; i++) {
    const arg = args[i];
    if (arg === "--command" || arg === "-c") {
      command = args[++i] || "";
    } else if (arg === "--args" || arg === "-a") {
      // Collect remaining args
      while (args[i + 1] && !args[i + 1].startsWith("--")) {
        serverArgs.push(args[++i]);
      }
    } else if (arg === "--global" || arg === "-g") {
      isGlobal = true;
    }
  }

  if (!command) {
    // Interactive mode - ask for command
    infoMessage("Adding MCP server interactively...");
    infoMessage("Example: npx @modelcontextprotocol/server-sqlite");

    // For now, require command flag
    errorMessage("Command required. Use --command <cmd>");
    return;
  }

  try {
    await addServer(
      name,
      {
        command,
        args: serverArgs.length > 0 ? serverArgs : undefined,
        enabled: true,
      },
      isGlobal,
    );

    successMessage(`Added MCP server: ${name}`);
    infoMessage(`Connect with: codetyper mcp connect ${name}`);
  } catch (err) {
    errorMessage(`Failed to add server: ${err}`);
  }
};

/**
 * Remove a server
 */
const handleRemove = async (args: string[]): Promise<void> => {
  const name = args[0];
  if (!name) {
    errorMessage("Server name required");
    return;
  }

  const isGlobal = args.includes("--global") || args.includes("-g");

  try {
    await removeServer(name, isGlobal);
    successMessage(`Removed MCP server: ${name}`);
  } catch (err) {
    errorMessage(`Failed to remove server: ${err}`);
  }
};

/**
 * Connect to server(s)
 */
const handleConnect = async (args: string[]): Promise<void> => {
  const name = args[0];

  if (name) {
    // Connect to specific server
    try {
      infoMessage(`Connecting to ${name}...`);
      const instance = await connectServer(name);
      successMessage(`Connected to ${name}`);
      console.log(`  Tools: ${instance.tools.length}`);
      console.log(`  Resources: ${instance.resources.length}`);
    } catch (err) {
      errorMessage(`Failed to connect: ${err}`);
    }
  } else {
    // Connect to all servers
    infoMessage("Connecting to all servers...");
    const results = await connectAllServers();

    for (const [serverName, instance] of results) {
      if (instance.state === "connected") {
        successMessage(
          `${serverName}: Connected (${instance.tools.length} tools)`,
        );
      } else {
        errorMessage(`${serverName}: ${instance.error || "Failed"}`);
      }
    }
  }
};

/**
 * Disconnect from server(s)
 */
const handleDisconnect = async (args: string[]): Promise<void> => {
  const name = args[0];

  if (name) {
    await disconnectServer(name);
    successMessage(`Disconnected from ${name}`);
  } else {
    await disconnectAllServers();
    successMessage("Disconnected from all servers");
  }
};

/**
 * Show connection status
 */
const handleStatus = async (_args: string[]): Promise<void> => {
  await initializeMCP();
  const instances = getServerInstances();

  if (instances.size === 0) {
    infoMessage("No MCP servers configured.");
    return;
  }

  console.log(chalk.bold("\nMCP Server Status:\n"));

  for (const [name, instance] of instances) {
    const stateColors: Record<string, (s: string) => string> = {
      connected: chalk.green,
      connecting: chalk.yellow,
      disconnected: chalk.gray,
      error: chalk.red,
    };

    const colorFn = stateColors[instance.state] || chalk.white;
    const status = colorFn(instance.state.toUpperCase());

    console.log(`  ${chalk.cyan(name)}: ${status}`);

    if (instance.state === "connected") {
      console.log(`    Tools: ${instance.tools.length}`);
      console.log(`    Resources: ${instance.resources.length}`);
    }

    if (instance.error) {
      console.log(`    Error: ${chalk.red(instance.error)}`);
    }

    console.log();
  }
};

/**
 * List available tools
 */
const handleTools = async (_args: string[]): Promise<void> => {
  await connectAllServers();
  const tools = getAllTools();

  if (tools.length === 0) {
    infoMessage("No tools available. Connect to MCP servers first.");
    return;
  }

  console.log(chalk.bold("\nAvailable MCP Tools:\n"));

  // Group by server
  const byServer = new Map<string, typeof tools>();
  for (const item of tools) {
    const existing = byServer.get(item.server) || [];
    existing.push(item);
    byServer.set(item.server, existing);
  }

  for (const [server, serverTools] of byServer) {
    console.log(chalk.cyan(`  ${server}:`));
    for (const { tool } of serverTools) {
      console.log(`    - ${chalk.white(tool.name)}`);
      if (tool.description) {
        console.log(`      ${chalk.gray(tool.description)}`);
      }
    }
    console.log();
  }
};

/**
 * Show help
 */
const handleHelp = async (_args: string[]): Promise<void> => {
  console.log(`
${chalk.bold("MCP (Model Context Protocol) Management")}

${chalk.cyan("Usage:")}
  codetyper mcp <command> [options]

${chalk.cyan("Commands:")}
  list                    List configured servers
  add <name>              Add a new server
    --command, -c <cmd>   Command to run
    --args, -a <args>     Arguments for command
    --global, -g          Add to global config
  remove <name>           Remove a server
    --global, -g          Remove from global config
  connect [name]          Connect to server(s)
  disconnect [name]       Disconnect from server(s)
  status                  Show connection status
  tools                   List available tools from connected servers

${chalk.cyan("Examples:")}
  codetyper mcp add sqlite -c npx -a @modelcontextprotocol/server-sqlite
  codetyper mcp connect sqlite
  codetyper mcp tools
`);
};

export default mcpCommand;
