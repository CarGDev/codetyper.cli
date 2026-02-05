/**
 * Security Service - Pattern detection and validation
 *
 * Provides:
 * - Command injection detection
 * - XSS pattern detection
 * - Permission explainer
 * - Shell continuation validation
 * - OAuth token filtering
 * - Security pattern hooks
 */

export type SecurityRisk = "critical" | "high" | "medium" | "low" | "info";

export interface SecurityIssue {
  type: string;
  risk: SecurityRisk;
  description: string;
  location?: string;
  suggestion?: string;
}

export interface SecurityReport {
  issues: SecurityIssue[];
  hasCritical: boolean;
  hasHigh: boolean;
  summary: string;
}

// Command injection patterns
const COMMAND_INJECTION_PATTERNS = [
  // Shell metacharacters
  { pattern: /[;&|`$]/, description: "Shell metacharacter detected" },
  // Subshell execution
  { pattern: /\$\([^)]+\)/, description: "Subshell execution detected" },
  // Backtick execution
  { pattern: /`[^`]+`/, description: "Backtick command execution detected" },
  // Pipe chains
  { pattern: /\|(?!\|)/, description: "Pipe character detected" },
  // Redirections
  { pattern: /[<>]/, description: "Redirection operator detected" },
  // Newline injection
  { pattern: /[\n\r]/, description: "Newline character in command" },
  // Null byte injection
  { pattern: /\x00/, description: "Null byte detected" },
  // Environment variable expansion
  { pattern: /\$\{[^}]+\}/, description: "Environment variable expansion" },
  {
    pattern: /\$[A-Za-z_][A-Za-z0-9_]*/,
    description: "Variable reference detected",
  },
];

// XSS patterns
const XSS_PATTERNS = [
  // Script tags
  { pattern: /<script[\s>]/i, description: "Script tag detected" },
  // Event handlers
  { pattern: /on\w+\s*=/i, description: "Event handler attribute detected" },
  // JavaScript protocol
  { pattern: /javascript:/i, description: "JavaScript protocol detected" },
  // Data URLs with script content
  {
    pattern: /data:[^,]*;base64/i,
    description: "Data URL with base64 encoding",
  },
  // Expression/eval
  { pattern: /expression\s*\(/i, description: "CSS expression detected" },
  // SVG with script
  { pattern: /<svg[\s>].*?<script/i, description: "SVG with embedded script" },
  // Template literals in HTML
  { pattern: /\{\{.*?\}\}/i, description: "Template literal detected" },
  // HTML entities that could be script
  { pattern: /&#x?[0-9a-f]+;/i, description: "HTML entity encoding detected" },
];

// SQL injection patterns
const SQL_INJECTION_PATTERNS = [
  { pattern: /(['"])\s*;\s*--/i, description: "SQL comment injection" },
  { pattern: /union\s+select/i, description: "UNION SELECT statement" },
  { pattern: /'\s*or\s+'?1'?\s*=\s*'?1/i, description: "OR 1=1 pattern" },
  { pattern: /drop\s+table/i, description: "DROP TABLE statement" },
  { pattern: /insert\s+into/i, description: "INSERT INTO statement" },
  { pattern: /delete\s+from/i, description: "DELETE FROM statement" },
];

// Dangerous system calls
const DANGEROUS_CALLS_PATTERNS = [
  { pattern: /eval\s*\(/i, description: "eval() usage detected" },
  { pattern: /exec\s*\(/i, description: "exec() usage detected" },
  { pattern: /system\s*\(/i, description: "system() call detected" },
  { pattern: /os\.system\s*\(/i, description: "os.system() call detected" },
  {
    pattern: /subprocess\.call\s*\(/i,
    description: "subprocess.call() detected",
  },
  { pattern: /child_process/i, description: "child_process module usage" },
  {
    pattern: /pickle\.loads?\s*\(/i,
    description: "Pickle deserialization detected",
  },
  { pattern: /yaml\.unsafe_load\s*\(/i, description: "Unsafe YAML loading" },
  { pattern: /unserialize\s*\(/i, description: "PHP unserialize() detected" },
];

// Shell continuation patterns (dangerous when user-controlled)
const SHELL_CONTINUATION_PATTERNS = [
  { pattern: /\\\s*$/, description: "Line continuation at end" },
  { pattern: /;\s*$/, description: "Command separator at end" },
  { pattern: /\|\s*$/, description: "Pipe at end (awaiting next command)" },
  { pattern: /&&\s*$/, description: "AND operator at end" },
  { pattern: /\|\|\s*$/, description: "OR operator at end" },
];

// OAuth/API token patterns (for filtering)
const TOKEN_PATTERNS = [
  // Generic API keys
  { pattern: /api[_-]?key[=:]["']?[a-zA-Z0-9_-]{20,}["']?/i, type: "API Key" },
  // OAuth tokens
  {
    pattern: /bearer\s+[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+/i,
    type: "JWT Token",
  },
  {
    pattern: /oauth[_-]?token[=:]["']?[a-zA-Z0-9_-]{20,}["']?/i,
    type: "OAuth Token",
  },
  // AWS credentials
  { pattern: /AKIA[0-9A-Z]{16}/i, type: "AWS Access Key" },
  {
    pattern:
      /aws[_-]?secret[_-]?access[_-]?key[=:]["']?[a-zA-Z0-9/+=]{40}["']?/i,
    type: "AWS Secret Key",
  },
  // GitHub tokens
  { pattern: /gh[pousr]_[A-Za-z0-9_]{36,}/i, type: "GitHub Token" },
  // Generic secrets
  { pattern: /password[=:]["']?[^\s"']{8,}["']?/i, type: "Password" },
  { pattern: /secret[=:]["']?[^\s"']{8,}["']?/i, type: "Secret" },
  // Private keys
  {
    pattern: /-----BEGIN\s+(?:RSA|DSA|EC|OPENSSH)?\s*PRIVATE\s+KEY-----/i,
    type: "Private Key",
  },
];

const checkPatterns = (
  content: string,
  patterns: Array<{ pattern: RegExp; description: string }>,
  type: string,
  risk: SecurityRisk,
): SecurityIssue[] => {
  const issues: SecurityIssue[] = [];

  for (const { pattern, description } of patterns) {
    const match = content.match(pattern);
    if (match) {
      issues.push({
        type,
        risk,
        description,
        location: match[0].slice(0, 50) + (match[0].length > 50 ? "..." : ""),
      });
    }
  }

  return issues;
};

export const detectCommandInjection = (command: string): SecurityIssue[] => {
  return checkPatterns(
    command,
    COMMAND_INJECTION_PATTERNS,
    "command_injection",
    "critical",
  );
};

export const detectXSS = (content: string): SecurityIssue[] => {
  return checkPatterns(content, XSS_PATTERNS, "xss", "high");
};

export const detectSQLInjection = (content: string): SecurityIssue[] => {
  return checkPatterns(
    content,
    SQL_INJECTION_PATTERNS,
    "sql_injection",
    "critical",
  );
};

export const detectDangerousCalls = (code: string): SecurityIssue[] => {
  return checkPatterns(
    code,
    DANGEROUS_CALLS_PATTERNS,
    "dangerous_call",
    "high",
  );
};

export const detectShellContinuation = (command: string): SecurityIssue[] => {
  return checkPatterns(
    command,
    SHELL_CONTINUATION_PATTERNS,
    "shell_continuation",
    "medium",
  );
};

export const findSensitiveTokens = (
  content: string,
): Array<{ type: string; match: string; masked: string }> => {
  const tokens: Array<{ type: string; match: string; masked: string }> = [];

  for (const { pattern, type } of TOKEN_PATTERNS) {
    const matches = content.matchAll(new RegExp(pattern, "gi"));
    for (const match of matches) {
      const value = match[0];
      // Mask the token, keeping first and last 4 characters
      const masked =
        value.length > 12
          ? value.slice(0, 4) + "*".repeat(value.length - 8) + value.slice(-4)
          : "*".repeat(value.length);

      tokens.push({ type, match: value, masked });
    }
  }

  return tokens;
};

export const filterSensitiveTokens = (content: string): string => {
  let filtered = content;

  for (const { pattern } of TOKEN_PATTERNS) {
    filtered = filtered.replace(new RegExp(pattern, "gi"), (match) => {
      if (match.length > 12) {
        return (
          match.slice(0, 4) + "*".repeat(match.length - 8) + match.slice(-4)
        );
      }
      return "*".repeat(match.length);
    });
  }

  return filtered;
};

export const validateCommand = (command: string): SecurityReport => {
  const issues: SecurityIssue[] = [
    ...detectCommandInjection(command),
    ...detectShellContinuation(command),
  ];

  return {
    issues,
    hasCritical: issues.some((i) => i.risk === "critical"),
    hasHigh: issues.some((i) => i.risk === "high"),
    summary:
      issues.length === 0
        ? "No security issues detected"
        : `Found ${issues.length} potential security issue(s)`,
  };
};

export const validateCode = (code: string): SecurityReport => {
  const issues: SecurityIssue[] = [
    ...detectDangerousCalls(code),
    ...detectXSS(code),
    ...detectSQLInjection(code),
  ];

  return {
    issues,
    hasCritical: issues.some((i) => i.risk === "critical"),
    hasHigh: issues.some((i) => i.risk === "high"),
    summary:
      issues.length === 0
        ? "No security issues detected"
        : `Found ${issues.length} potential security issue(s)`,
  };
};

export const explainPermission = (
  tool: string,
  args: Record<string, unknown>,
): { explanation: string; risks: string[]; recommendation: string } => {
  const explanations: Record<
    string,
    (args: Record<string, unknown>) => {
      explanation: string;
      risks: string[];
      recommendation: string;
    }
  > = {
    bash: (args) => {
      const command = (args.command as string) ?? "";
      const report = validateCommand(command);

      return {
        explanation: `Execute shell command: ${command.slice(0, 100)}${command.length > 100 ? "..." : ""}`,
        risks: report.issues.map(
          (i) => `${i.risk.toUpperCase()}: ${i.description}`,
        ),
        recommendation: report.hasCritical
          ? "DENY - Critical security risk detected"
          : report.hasHigh
            ? "REVIEW CAREFULLY - High risk patterns detected"
            : "ALLOW - No obvious security issues",
      };
    },

    write: (args) => {
      const filePath =
        (args.path as string) ?? (args.file_path as string) ?? "";
      const content = (args.content as string) ?? "";
      const tokens = findSensitiveTokens(content);

      return {
        explanation: `Write to file: ${filePath}`,
        risks: [
          ...(filePath.includes("..") ? ["Path traversal attempt"] : []),
          ...(tokens.length > 0
            ? [`Contains ${tokens.length} potential sensitive token(s)`]
            : []),
        ],
        recommendation:
          filePath.includes("..") || tokens.length > 0
            ? "REVIEW CAREFULLY - Potential security concerns"
            : "ALLOW - File write operation",
      };
    },

    edit: (args) => {
      const filePath =
        (args.path as string) ?? (args.file_path as string) ?? "";

      return {
        explanation: `Edit file: ${filePath}`,
        risks: filePath.includes("..") ? ["Path traversal attempt"] : [],
        recommendation: filePath.includes("..")
          ? "DENY - Path traversal detected"
          : "ALLOW - File edit operation",
      };
    },

    read: (args) => {
      const filePath =
        (args.path as string) ?? (args.file_path as string) ?? "";

      return {
        explanation: `Read file: ${filePath}`,
        risks: [
          ...(filePath.includes("..") ? ["Path traversal attempt"] : []),
          ...(filePath.match(/\.(env|pem|key|secret)$/i)
            ? ["Reading potentially sensitive file"]
            : []),
        ],
        recommendation: filePath.includes("..")
          ? "DENY - Path traversal detected"
          : "ALLOW - File read operation",
      };
    },
  };

  const explainer = explanations[tool];
  if (explainer) {
    return explainer(args);
  }

  return {
    explanation: `Execute tool: ${tool}`,
    risks: [],
    recommendation: "ALLOW - Standard tool operation",
  };
};

export const securityService = {
  detectCommandInjection,
  detectXSS,
  detectSQLInjection,
  detectDangerousCalls,
  detectShellContinuation,
  findSensitiveTokens,
  filterSensitiveTokens,
  validateCommand,
  validateCode,
  explainPermission,
};
