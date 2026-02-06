/**
 * Dangerous Command Patterns
 *
 * Patterns to detect and block dangerous bash commands that could
 * cause irreversible damage to the system or data.
 */

/**
 * Category of danger for a blocked command
 */
export type DangerCategory =
  | "destructive_delete"
  | "privilege_escalation"
  | "system_damage"
  | "network_attack"
  | "git_destructive"
  | "credential_exposure";

/**
 * A blocked command pattern with metadata
 */
export interface BlockedPattern {
  name: string;
  pattern: RegExp;
  category: DangerCategory;
  description: string;
  severity: "critical" | "high" | "medium";
}

/**
 * Blocked command patterns organized by category
 */
export const BLOCKED_PATTERNS: BlockedPattern[] = [
  // ==========================================================================
  // Destructive File Operations - CRITICAL
  // ==========================================================================
  {
    name: "rm_rf_root",
    pattern: /\brm\s+(-[rfRvI]*\s+)*[\/]\s*$/,
    category: "destructive_delete",
    description: "Delete root filesystem",
    severity: "critical",
  },
  {
    name: "rm_rf_root_star",
    pattern: /\brm\s+(-[rfRvI]*\s+)*[\/]\*/,
    category: "destructive_delete",
    description: "Delete all files in root",
    severity: "critical",
  },
  {
    name: "rm_rf_home",
    pattern: /\brm\s+(-[rfRvI]*\s+)*~\s*$/,
    category: "destructive_delete",
    description: "Delete home directory",
    severity: "critical",
  },
  {
    name: "rm_rf_home_star",
    pattern: /\brm\s+(-[rfRvI]*\s+)*~\/\*/,
    category: "destructive_delete",
    description: "Delete all files in home directory",
    severity: "critical",
  },
  {
    name: "rm_rf_star",
    pattern: /\brm\s+(-[rfRvI]*\s+)*\*\s*$/,
    category: "destructive_delete",
    description: "Delete all files in current directory recursively",
    severity: "high",
  },
  {
    name: "rm_rf_git",
    pattern: /\brm\s+(-[rfRvI]*\s+)*\.git\s*$/,
    category: "destructive_delete",
    description: "Delete git history",
    severity: "high",
  },

  // ==========================================================================
  // Privilege Escalation - CRITICAL
  // ==========================================================================
  {
    name: "sudo_any",
    pattern: /\bsudo\s+/,
    category: "privilege_escalation",
    description: "Sudo command (requires elevated privileges)",
    severity: "critical",
  },
  {
    name: "su_root",
    pattern: /\bsu\s+(-\s*)?$/,
    category: "privilege_escalation",
    description: "Switch to root user",
    severity: "critical",
  },
  {
    name: "doas_any",
    pattern: /\bdoas\s+/,
    category: "privilege_escalation",
    description: "Doas command (OpenBSD privilege escalation)",
    severity: "critical",
  },

  // ==========================================================================
  // System Damage - CRITICAL
  // ==========================================================================
  {
    name: "dd_disk_wipe",
    pattern: /\bdd\s+.*if=\/dev\/(zero|random|urandom).*of=\/dev\//,
    category: "system_damage",
    description: "Disk wipe with dd",
    severity: "critical",
  },
  {
    name: "chmod_777_root",
    pattern: /\bchmod\s+(-R\s+)?777\s+\//,
    category: "system_damage",
    description: "Set insecure permissions on root",
    severity: "critical",
  },
  {
    name: "mkfs_format",
    pattern: /\bmkfs\./,
    category: "system_damage",
    description: "Format filesystem",
    severity: "critical",
  },
  {
    name: "fork_bomb",
    pattern: /:\(\)\s*{\s*:\s*\|\s*:\s*&\s*}\s*;?\s*:/,
    category: "system_damage",
    description: "Fork bomb",
    severity: "critical",
  },

  // ==========================================================================
  // Network Attacks - HIGH
  // ==========================================================================
  {
    name: "curl_pipe_bash",
    pattern: /\bcurl\s+.*\|\s*(ba)?sh/,
    category: "network_attack",
    description: "Download and execute script",
    severity: "high",
  },
  {
    name: "wget_pipe_bash",
    pattern: /\bwget\s+.*\|\s*(ba)?sh/,
    category: "network_attack",
    description: "Download and execute script",
    severity: "high",
  },
  {
    name: "curl_pipe_sudo",
    pattern: /\bcurl\s+.*\|\s*sudo/,
    category: "network_attack",
    description: "Download and execute with elevated privileges",
    severity: "critical",
  },
  {
    name: "nc_reverse_shell",
    pattern: /\bnc\s+.*-e\s+\/bin\/(ba)?sh/,
    category: "network_attack",
    description: "Reverse shell with netcat",
    severity: "critical",
  },
  {
    name: "bash_reverse_shell",
    pattern: /\/dev\/tcp\//,
    category: "network_attack",
    description: "Bash reverse shell",
    severity: "critical",
  },

  // ==========================================================================
  // Git Destructive - HIGH
  // ==========================================================================
  {
    name: "git_force_push_main",
    pattern: /\bgit\s+push\s+.*--force.*\b(main|master)\b/,
    category: "git_destructive",
    description: "Force push to main/master branch",
    severity: "high",
  },
  {
    name: "git_force_push_main_alt",
    pattern: /\bgit\s+push\s+.*\b(main|master)\b.*--force/,
    category: "git_destructive",
    description: "Force push to main/master branch",
    severity: "high",
  },
  {
    name: "git_reset_hard_origin",
    pattern: /\bgit\s+reset\s+--hard\s+origin/,
    category: "git_destructive",
    description: "Discard all local changes and reset to remote",
    severity: "high",
  },
  {
    name: "git_clean_force",
    pattern: /\bgit\s+clean\s+(-[fd]+\s*)+/,
    category: "git_destructive",
    description: "Delete untracked files and directories",
    severity: "medium",
  },

  // ==========================================================================
  // Credential Exposure - MEDIUM
  // ==========================================================================
  {
    name: "cat_env_file",
    pattern: /\bcat\s+.*\.env\b/,
    category: "credential_exposure",
    description: "Read environment file (may contain secrets)",
    severity: "medium",
  },
  {
    name: "echo_secret_env",
    pattern: /\becho\s+.*\$[A-Z_]*(SECRET|PASSWORD|KEY|TOKEN|CREDENTIAL)/i,
    category: "credential_exposure",
    description: "Echo secret environment variable",
    severity: "medium",
  },
  {
    name: "printenv_secrets",
    pattern: /\bprintenv\s+(SECRET|PASSWORD|KEY|TOKEN|CREDENTIAL)/i,
    category: "credential_exposure",
    description: "Print secret environment variable",
    severity: "medium",
  },
];

/**
 * Messages for blocked commands
 */
export const BLOCKED_COMMAND_MESSAGES = {
  BLOCKED_TITLE: "Dangerous command blocked",
  BLOCKED_PREFIX: "BLOCKED",
  CATEGORY_DESCRIPTIONS: {
    destructive_delete: "This command would delete critical files or directories",
    privilege_escalation: "This command requires elevated privileges which could compromise system security",
    system_damage: "This command could cause irreversible damage to the system",
    network_attack: "This command could execute untrusted code or establish unauthorized network connections",
    git_destructive: "This command could destroy git history or overwrite shared branches",
    credential_exposure: "This command could expose sensitive credentials or secrets",
  } as Record<DangerCategory, string>,
  CANNOT_BYPASS: "This block cannot be bypassed for safety reasons.",
  SUGGESTION: "If you need to perform this action, do it manually outside of CodeTyper.",
};
