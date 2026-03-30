import { agentLoader } from "@services/agent-loader";
import chalk from "chalk";

export async function listAgents(): Promise<void> {
  const agents = await agentLoader.getAvailableAgents(process.cwd());
  if (agents.length === 0) {
    console.log(chalk.gray("No agents found."));
    return;
  }
  const rows = agents.map((a) => [a.name, a.mode ?? "primary", a.description ?? ""]);
  const header = [chalk.bold("Name"), chalk.bold("Mode"), chalk.bold("Description")];
  const table = [header, ...rows];
  // Calculate column widths
  const colWidths = [0, 1, 2].map(i => Math.max(...table.map(row => row[i].length)));
  for (const row of table) {
    console.log(
      row.map((cell, i) => cell.padEnd(colWidths[i])).join("   ")
    );
  }
}
