/**
 * Show MCP server status in chat
 */

import chalk from "chalk";
import {
  initializeMCP,
  getServerInstances,
  getAllTools,
  isMCPAvailable,
} from "@services/mcp/index";

/**
 * Display MCP server status
 */
export const showMCPStatus = async (): Promise<void> => {
  await initializeMCP();

  const hasServers = await isMCPAvailable();
  if (!hasServers) {
    console.log(chalk.yellow("\nNo MCP servers configured."));
    console.log(chalk.gray("Add a server with: codetyper mcp add <name>"));
    console.log();
    return;
  }

  const instances = getServerInstances();
  const tools = getAllTools();

  console.log(chalk.bold("\nMCP Status\n"));

  // Server status
  console.log(chalk.cyan("Servers:"));
  for (const [name, instance] of instances) {
    const stateColors: Record<string, (s: string) => string> = {
      connected: chalk.green,
      connecting: chalk.yellow,
      disconnected: chalk.gray,
      error: chalk.red,
    };

    const colorFn = stateColors[instance.state] || chalk.white;
    const status = colorFn(instance.state);
    const toolCount =
      instance.state === "connected" ? ` (${instance.tools.length} tools)` : "";

    console.log(`  ${chalk.white(name)}: ${status}${chalk.gray(toolCount)}`);

    if (instance.error) {
      console.log(`    ${chalk.red(instance.error)}`);
    }
  }

  // Tool summary
  if (tools.length > 0) {
    console.log();
    console.log(chalk.cyan(`Available Tools: ${chalk.white(tools.length)}`));

    // Group by server
    const byServer = new Map<string, string[]>();
    for (const { server, tool } of tools) {
      const existing = byServer.get(server) || [];
      existing.push(tool.name);
      byServer.set(server, existing);
    }

    for (const [server, toolNames] of byServer) {
      console.log(`  ${chalk.gray(server)}: ${toolNames.join(", ")}`);
    }
  }

  console.log();
  console.log(chalk.gray("Use /mcp connect to connect servers"));
  console.log(chalk.gray("Use /mcp tools for detailed tool info"));
  console.log();
};
