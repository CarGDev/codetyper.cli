#!/usr/bin/env node

import { Command } from "commander";
import { handleCommand } from "@commands/core/handlers";
import { execute } from "@commands/chat-tui";
import versionData from "@/version.json";
import { initializeProviders } from "@providers/login/core/initialize";
import { loginProvider } from "@providers/login/handlers";
import { getProviderNames } from "@providers/core/registry";
import { displayProvidersStatus } from "@providers/core/status";
import { getConfig } from "@services/core/config";
import { deleteSession, getSessionSummaries } from "@services/core/session";
import {
  initializePermissions,
  listPatterns,
  addGlobalPattern,
  addLocalPattern,
} from "@services/core/permissions";
import {
  projectConfig,
  initProject,
  initGlobal,
  getRules,
  addRule,
  getAgents,
  getSkills,
  getLearnings,
  addLearning,
  getSettings,
  buildLearningsContext,
} from "@services/project-config";
import { createPlan, displayPlan, approvePlan } from "@services/planner";
import { ensureXdgDirectories } from "@utils/core/ensure-directories";
import chalk from "chalk";

// Read version from version.json
const { version } = versionData;

// Ensure XDG directories exist
await ensureXdgDirectories();

// Auto-initialize config folders on startup
await projectConfig.autoInitialize();

const program = new Command();

program
  .name("codetyper")
  .description("CodeTyper AI Agent - Autonomous code generation assistant")
  .version(version)
  .argument("[prompt...]", "Initial prompt to start chat with")
  .option("-p, --print", "Print response and exit (non-interactive mode)")
  .option(
    "-c, --continue",
    "Continue most recent conversation in current directory",
  )
  .option("-r, --resume <session>", "Resume a specific session by ID")
  .option("-m, --model <model>", "Model to use")
  .option("--provider <provider>", "Provider to use (copilot, ollama)")
  .option("-f, --file <files...>", "Files to add to context")
  .option("--system-prompt <prompt>", "Replace the system prompt")
  .option("--append-system-prompt <prompt>", "Append to the system prompt")
  .option("--verbose", "Enable verbose output")
  .option("-y, --yes", "Auto-approve all tool executions")
  .action(async (promptParts, options) => {
    await initializeProviders();

    const initialPrompt = promptParts.join(" ").trim();

    // Check for piped input
    let pipedInput = "";
    if (!process.stdin.isTTY) {
      const chunks: Buffer[] = [];
      for await (const chunk of process.stdin) {
        chunks.push(chunk);
      }
      pipedInput = Buffer.concat(chunks).toString("utf-8").trim();
    }

    // Combine piped input with prompt
    const fullPrompt = pipedInput
      ? initialPrompt
        ? `${pipedInput}\n\n${initialPrompt}`
        : pipedInput
      : initialPrompt;

    const chatOptions = {
      provider: options.provider,
      model: options.model,
      files: options.file,
      initialPrompt: fullPrompt || undefined,
      continueSession: options.continue,
      resumeSession: options.resume,
      systemPrompt: options.systemPrompt,
      appendSystemPrompt: options.appendSystemPrompt,
      printMode: options.print,
      verbose: options.verbose,
      autoApprove: options.yes,
    };

    await execute(chatOptions);
  });

// ========== LOGIN COMMAND ==========
program
  .command("login [provider]")
  .description("Configure API credentials for a provider")
  .action(async (provider?: string) => {
    await initializeProviders();

    const validProviders = getProviderNames();

    if (!provider) {
      console.log("\n" + chalk.bold("Available providers:"));
      for (const p of validProviders) {
        console.log(`  - ${p}`);
      }
      console.log("\n" + chalk.gray("Usage: codetyper login <provider>"));
      return;
    }

    if (!validProviders.includes(provider as any)) {
      console.error(chalk.red(`Invalid provider: ${provider}`));
      console.log("Valid providers: " + validProviders.join(", "));
      process.exit(1);
    }

    await loginProvider(provider as any);
  });

// ========== RUN COMMAND ==========
program
  .command("run <task>")
  .description("Execute autonomous task with the agent")
  .option("-a, --agent <type>", "Agent type to use", "coder")
  .option("-f, --file <files...>", "Context files for the task")
  .option("-d, --dry-run", "Generate plan only, don't execute", false)
  .option("-i, --max-iterations <number>", "Maximum iterations", "20")
  .option("--auto-approve", "Automatically approve all actions", false)
  .action(async (task, options) => {
    await initializeProviders();
    await handleCommand("run", { task, files: options.file, ...options });
  });

// ========== SESSION COMMAND ==========
const sessionCommand = program
  .command("session")
  .description("Manage chat sessions");

sessionCommand
  .command("list")
  .alias("ls")
  .description("List all saved sessions")
  .action(async () => {
    const summaries = await getSessionSummaries();

    if (summaries.length === 0) {
      console.log(chalk.gray("No saved sessions"));
      return;
    }

    console.log("\n" + chalk.bold("Saved Sessions:") + "\n");

    for (const session of summaries) {
      const date = new Date(session.updatedAt).toLocaleDateString();
      const time = new Date(session.updatedAt).toLocaleTimeString();
      const preview = session.lastMessage
        ? session.lastMessage.slice(0, 60).replace(/\n/g, " ")
        : "(no messages)";

      console.log(`${chalk.cyan(session.id)}`);
      console.log(
        `  ${chalk.gray(`${date} ${time}`)} | ${session.messageCount} messages`,
      );
      console.log(
        `  ${chalk.gray(preview)}${preview.length >= 60 ? "..." : ""}`,
      );
      if (session.workingDirectory) {
        console.log(`  ${chalk.gray(`Dir: ${session.workingDirectory}`)}`);
      }
      console.log();
    }
  });

sessionCommand
  .command("delete <id>")
  .alias("rm")
  .description("Delete a session by ID")
  .action(async (id: string) => {
    try {
      await deleteSession(id);
      console.log(chalk.green(`Deleted session: ${id}`));
    } catch (error) {
      console.error(chalk.red(`Failed to delete session: ${error}`));
    }
  });

// ========== MODELS COMMAND ==========
program
  .command("models [provider]")
  .description("List available models for a provider")
  .action(async (provider?: string) => {
    await initializeProviders();
    const config = await getConfig();
    const targetProvider = (provider || config.get("provider")) as any;

    const { getProvider } = await import("@providers/core/registry");
    const { getProviderStatus } = await import("@providers/core/status");
    const providerInstance = getProvider(targetProvider);
    const status = await getProviderStatus(targetProvider);

    console.log(`\n${chalk.bold(providerInstance.displayName)} Models\n`);

    if (!status.valid) {
      console.log(
        chalk.yellow(
          `Provider not configured. Run: codetyper login ${targetProvider}`,
        ),
      );
      return;
    }

    const models = await providerInstance.getModels();
    const defaultModel = providerInstance.getDefaultModel();

    for (const model of models) {
      const isDefault = model.id === defaultModel;
      const marker = isDefault ? chalk.green("*") : " ";
      const tools = model.supportsTools ? chalk.gray("[tools]") : "";
      const streaming = model.supportsStreaming ? chalk.gray("[stream]") : "";

      console.log(
        `${marker} ${chalk.cyan(model.id)} - ${model.name} ${tools} ${streaming}`,
      );
    }

    console.log(`\n${chalk.gray("* = default model")}`);
  });

// ========== PROVIDERS COMMAND ==========
program
  .command("providers")
  .description("Show status of all LLM providers")
  .action(async () => {
    await initializeProviders();
    const config = await getConfig();
    await displayProvidersStatus(config.get("provider"));
  });

// ========== CONFIG COMMAND ==========
const configCommand = program
  .command("config")
  .description("View or modify CLI configuration");

configCommand
  .command("show")
  .description("Show current configuration")
  .action(async () => {
    await handleCommand("config", { action: "show" });
  });

configCommand
  .command("path")
  .description("Show config file path")
  .action(async () => {
    await handleCommand("config", { action: "path" });
  });

configCommand
  .command("set <key> <value>")
  .description("Set configuration value (provider, model)")
  .action(async (key, value) => {
    await handleCommand("config", { action: "set", key, value });
  });

// ========== CLASSIFY COMMAND ==========
program
  .command("classify <prompt>")
  .description("Analyze user prompt and classify the intent")
  .option("-c, --context <context>", "Additional context for classification")
  .option("-f, --file <files...>", "Referenced files for context")
  .action(async (prompt, options) => {
    await initializeProviders();
    await handleCommand("classify", {
      prompt,
      files: options.file,
      ...options,
    });
  });

// ========== PLAN COMMAND ==========
const planCommand = program
  .command("plan")
  .description("Generate a detailed execution plan for a task");

["code", "fix", "refactor", "test", "document", "explain"].forEach((intent) => {
  planCommand
    .command(intent)
    .description(`Plan for ${intent} intent`)
    .requiredOption("-t, --task <task>", "Task description")
    .option("-f, --file <files...>", "Files to operate on")
    .option("-o, --output <file>", "Save plan to file (JSON format)")
    .action(async (options) => {
      await initializeProviders();
      await handleCommand("plan", { intent, files: options.file, ...options });
    });
});

// ========== INIT COMMAND ==========
program
  .command("init")
  .description("Initialize codetyper configuration in current directory")
  .option("-g, --global", "Initialize global configuration")
  .action(async (options) => {
    if (options.global) {
      await initGlobal();
      console.log(
        chalk.green(
          "✓ Initialized global configuration at ~/.config/codetyper/",
        ),
      );
    } else {
      await initProject();
      console.log(
        chalk.green("✓ Initialized project configuration at .codetyper/"),
      );
    }

    console.log("\nCreated directories:");
    console.log(chalk.gray("  - rules/     (project-specific rules)"));
    console.log(chalk.gray("  - agents/    (custom agent configurations)"));
    console.log(chalk.gray("  - skills/    (custom skills/commands)"));
    console.log(chalk.gray("  - learnings/ (saved learnings)"));
  });

// ========== PERMISSIONS COMMAND ==========
const permCommand = program
  .command("permissions")
  .alias("perm")
  .description("Manage command execution permissions");

permCommand
  .command("list")
  .alias("ls")
  .description("List all permission patterns")
  .action(async () => {
    await initializePermissions();
    const patterns = listPatterns();

    console.log("\n" + chalk.bold("Permission Patterns") + "\n");

    const hasPatterns =
      patterns.global.length > 0 ||
      patterns.local.length > 0 ||
      patterns.session.length > 0;
    if (!hasPatterns) {
      console.log(chalk.gray("No permission patterns configured"));
      console.log(
        chalk.gray("\nPatterns are auto-created when you approve commands."),
      );
      console.log(
        chalk.gray(
          "Format: Bash(command:args), Read(*), Write(*.ts), Edit(src/*)",
        ),
      );
      return;
    }

    if (patterns.global.length > 0) {
      console.log(
        chalk.magenta("Global Patterns (~/.config/codetyper/settings.json):"),
      );
      for (const pattern of patterns.global) {
        console.log(`  ${chalk.green("allow")} ${pattern}`);
      }
      console.log();
    }

    if (patterns.local.length > 0) {
      console.log(chalk.cyan("Project Patterns (.codetyper/settings.json):"));
      for (const pattern of patterns.local) {
        console.log(`  ${chalk.green("allow")} ${pattern}`);
      }
      console.log();
    }

    if (patterns.session.length > 0) {
      console.log(chalk.yellow("Session Patterns (temporary):"));
      for (const pattern of patterns.session) {
        console.log(`  ${chalk.green("allow")} ${pattern}`);
      }
    }
  });

permCommand
  .command("allow <pattern>")
  .option("-g, --global", "Add to global patterns")
  .option("-l, --local", "Add to project patterns (default)")
  .description("Allow a pattern (e.g., Bash(npm install:*), Read(*))")
  .action(async (pattern: string, options) => {
    await initializePermissions();
    if (options.global) {
      await addGlobalPattern(pattern);
      console.log(chalk.magenta(`✓ Added global pattern: ${pattern}`));
    } else {
      await addLocalPattern(pattern);
      console.log(chalk.cyan(`✓ Added project pattern: ${pattern}`));
    }
  });

// ========== RULES COMMAND ==========
const rulesCommand = program
  .command("rules")
  .description("Manage project rules");

rulesCommand
  .command("list")
  .alias("ls")
  .description("List all rules")
  .action(async () => {
    const rules = await getRules();

    console.log("\n" + chalk.bold("Project Rules") + "\n");

    if (rules.length === 0) {
      console.log(chalk.gray("No rules configured"));
      console.log(chalk.gray("Run: codetyper init"));
      return;
    }

    for (const rule of rules) {
      console.log(chalk.cyan(`• ${rule.name}`));
      const preview = rule.content.split("\n").slice(0, 3).join("\n");
      console.log(
        chalk.gray(preview.slice(0, 200) + (preview.length > 200 ? "..." : "")),
      );
      console.log();
    }
  });

rulesCommand
  .command("add <name>")
  .description("Add a new rule")
  .option("-g, --global", "Add as global rule")
  .option("-c, --content <content>", "Rule content")
  .action(async (name: string, options) => {
    if (!options.content) {
      console.log(
        chalk.yellow("Rule content is required. Use --content flag."),
      );
      return;
    }

    await addRule(name, options.content, options.global);
    console.log(chalk.green(`✓ Added rule: ${name}`));
  });

// ========== AGENTS COMMAND ==========
const agentsCommand = program
  .command("agents")
  .description("Manage custom agents");

agentsCommand
  .command("list")
  .alias("ls")
  .description("List all agents")
  .action(async () => {
    const agents = await getAgents();

    console.log("\n" + chalk.bold("Custom Agents") + "\n");

    if (agents.length === 0) {
      console.log(chalk.gray("No custom agents configured"));
      return;
    }

    for (const agent of agents) {
      console.log(chalk.cyan(`• ${agent.name}`));
      console.log(`  ${chalk.gray(agent.description)}`);
      if (agent.model) console.log(`  ${chalk.gray(`Model: ${agent.model}`)}`);
      console.log();
    }
  });

// ========== SKILLS COMMAND ==========
const skillsCommand = program
  .command("skills")
  .description("Manage custom skills");

skillsCommand
  .command("list")
  .alias("ls")
  .description("List all skills")
  .action(async () => {
    const skills = await getSkills();

    console.log("\n" + chalk.bold("Custom Skills") + "\n");

    if (skills.length === 0) {
      console.log(chalk.gray("No custom skills configured"));
      return;
    }

    for (const skill of skills) {
      console.log(chalk.cyan(`/${skill.command}`) + ` - ${skill.name}`);
      console.log(`  ${chalk.gray(skill.description)}`);
      console.log();
    }
  });

// ========== LEARNINGS COMMAND ==========
const learningsCommand = program
  .command("learnings")
  .alias("learn")
  .description("Manage project learnings");

learningsCommand
  .command("list")
  .alias("ls")
  .description("List all learnings")
  .action(async () => {
    const learnings = await getLearnings();

    console.log("\n" + chalk.bold("Project Learnings") + "\n");

    if (learnings.length === 0) {
      console.log(chalk.gray("No learnings saved"));
      return;
    }

    for (const learning of learnings.slice(0, 20)) {
      const date = new Date(learning.createdAt).toLocaleDateString();
      console.log(`${chalk.gray(date)} - ${learning.content.slice(0, 80)}`);
    }
  });

learningsCommand
  .command("add <content>")
  .description("Add a new learning")
  .option("-g, --global", "Add as global learning")
  .option("-c, --context <context>", "Context for the learning")
  .action(async (content: string, options) => {
    await addLearning(content, options.context, options.global);
    console.log(chalk.green("✓ Learning saved"));
  });

// ========== UPGRADE COMMAND ==========
program
  .command("upgrade")
  .description("Update codetyper to the latest version")
  .option("-c, --check", "Check for updates without installing")
  .option("-v, --version <version>", "Install a specific version")
  .action(async (options) => {
    const { performUpgrade } = await import("@services/upgrade");
    await performUpgrade({
      check: options.check,
      version: options.version,
    });
  });

// ========== MCP COMMAND ==========
program
  .command("mcp [subcommand] [args...]")
  .description("Manage MCP (Model Context Protocol) servers")
  .action(async (subcommand, args) => {
    const { mcpCommand } = await import("@commands/mcp");
    await mcpCommand([subcommand, ...args].filter(Boolean));
  });

// ========== TASK COMMAND ==========
program
  .command("task <description>")
  .alias("do")
  .description("Execute a task with automatic planning")
  .option("-f, --file <files...>", "Context files for the task")
  .option("-d, --dry-run", "Show plan without executing")
  .option("--auto-approve", "Automatically approve all actions")
  .action(async (description: string, options) => {
    await initializeProviders();
    await initializePermissions();

    const settings = await getSettings();

    // Build context from files and learnings
    let context = "";

    if (options.file) {
      const { readFile } = await import("fs/promises");
      for (const file of options.file) {
        try {
          const content = await readFile(file, "utf-8");
          context += `\n\n--- ${file} ---\n${content}`;
        } catch {
          console.log(chalk.yellow(`Warning: Could not read file ${file}`));
        }
      }
    }

    const learningsContext = await buildLearningsContext();
    if (learningsContext) {
      context += "\n\n" + learningsContext;
    }

    // Generate plan
    console.log(chalk.cyan("\nGenerating execution plan...\n"));

    const plan = await createPlan(
      description,
      context,
      settings.defaultProvider as any,
      settings.defaultModel,
    );

    displayPlan(plan);

    if (options.dryRun) {
      console.log(chalk.yellow("Dry run - not executing plan"));
      return;
    }

    // Ask for approval
    console.log("");
    console.log(chalk.yellow("Execute this plan? [y/n]: "));

    const answer = await new Promise<string>((resolve) => {
      process.stdin.setRawMode?.(true);
      process.stdin.resume();
      process.stdin.once("data", (data) => {
        process.stdin.setRawMode?.(false);
        resolve(data.toString().trim().toLowerCase());
      });
    });

    if (answer !== "y" && answer !== "yes") {
      console.log(chalk.gray("Plan cancelled"));
      return;
    }

    approvePlan();
    console.log(chalk.green("\n✓ Plan approved - executing...\n"));

    // Execute steps - this is a simplified version
    // In a full implementation, each step type would have specific handlers
    await execute({
      provider: settings.defaultProvider as any,
      model: settings.defaultModel,
      files: options.file,
      initialPrompt: `Execute this plan step by step:\n\n${plan.steps.map((s) => `${s.id}. ${s.description}`).join("\n")}`,
    });
  });

// Parse arguments
program.parse(process.argv);
