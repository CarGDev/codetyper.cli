/**
 * Sensitive File Patterns
 *
 * Patterns to detect and protect files that may contain credentials,
 * secrets, keys, or other sensitive information.
 */

/**
 * Category of sensitive file
 */
export type SensitiveFileCategory =
  | "environment"
  | "credentials"
  | "ssh_keys"
  | "api_tokens"
  | "certificates"
  | "cloud_config";

/**
 * A protected file pattern with metadata
 */
export interface ProtectedFilePattern {
  name: string;
  pattern: RegExp;
  category: SensitiveFileCategory;
  description: string;
  /** If true, block writes but warn on reads. If false, block both. */
  allowRead: boolean;
}

/**
 * Protected file patterns
 */
export const PROTECTED_FILE_PATTERNS: ProtectedFilePattern[] = [
  // ==========================================================================
  // Environment Files
  // ==========================================================================
  {
    name: "env_file",
    pattern: /\.env(\..*)?$/,
    category: "environment",
    description: "Environment configuration file",
    allowRead: true,
  },
  {
    name: "env_local",
    pattern: /\.env\.local$/,
    category: "environment",
    description: "Local environment file",
    allowRead: true,
  },

  // ==========================================================================
  // Credential Files
  // ==========================================================================
  {
    name: "credentials_json",
    pattern: /credentials?\.json$/i,
    category: "credentials",
    description: "Credentials JSON file",
    allowRead: false,
  },
  {
    name: "credentials_yaml",
    pattern: /credentials?\.ya?ml$/i,
    category: "credentials",
    description: "Credentials YAML file",
    allowRead: false,
  },
  {
    name: "secrets_json",
    pattern: /secrets?\.json$/i,
    category: "credentials",
    description: "Secrets JSON file",
    allowRead: false,
  },
  {
    name: "secrets_yaml",
    pattern: /secrets?\.ya?ml$/i,
    category: "credentials",
    description: "Secrets YAML file",
    allowRead: false,
  },

  // ==========================================================================
  // SSH Keys
  // ==========================================================================
  {
    name: "ssh_private_rsa",
    pattern: /id_rsa$/,
    category: "ssh_keys",
    description: "SSH RSA private key",
    allowRead: false,
  },
  {
    name: "ssh_private_ed25519",
    pattern: /id_ed25519$/,
    category: "ssh_keys",
    description: "SSH ED25519 private key",
    allowRead: false,
  },
  {
    name: "ssh_private_ecdsa",
    pattern: /id_ecdsa$/,
    category: "ssh_keys",
    description: "SSH ECDSA private key",
    allowRead: false,
  },
  {
    name: "ssh_private_dsa",
    pattern: /id_dsa$/,
    category: "ssh_keys",
    description: "SSH DSA private key",
    allowRead: false,
  },
  {
    name: "pem_key",
    pattern: /\.(pem|key)$/,
    category: "ssh_keys",
    description: "PEM or KEY file (may contain private key)",
    allowRead: false,
  },
  {
    name: "pkcs12",
    pattern: /\.(p12|pfx)$/,
    category: "ssh_keys",
    description: "PKCS#12 certificate bundle",
    allowRead: false,
  },

  // ==========================================================================
  // API Tokens & Package Manager Configs
  // ==========================================================================
  {
    name: "npmrc",
    pattern: /\.npmrc$/,
    category: "api_tokens",
    description: "NPM configuration (may contain auth token)",
    allowRead: true,
  },
  {
    name: "pypirc",
    pattern: /\.pypirc$/,
    category: "api_tokens",
    description: "PyPI configuration (may contain auth token)",
    allowRead: false,
  },
  {
    name: "docker_config",
    pattern: /\.docker\/config\.json$/,
    category: "api_tokens",
    description: "Docker config (may contain registry credentials)",
    allowRead: false,
  },

  // ==========================================================================
  // Cloud Configuration
  // ==========================================================================
  {
    name: "aws_credentials",
    pattern: /\.aws\/credentials$/,
    category: "cloud_config",
    description: "AWS credentials file",
    allowRead: false,
  },
  {
    name: "kube_config",
    pattern: /\.kube\/config$/,
    category: "cloud_config",
    description: "Kubernetes config (may contain cluster credentials)",
    allowRead: false,
  },
  {
    name: "gcloud_credentials",
    pattern: /application_default_credentials\.json$/,
    category: "cloud_config",
    description: "Google Cloud credentials",
    allowRead: false,
  },
  {
    name: "azure_credentials",
    pattern: /\.azure\/credentials$/,
    category: "cloud_config",
    description: "Azure credentials file",
    allowRead: false,
  },

  // ==========================================================================
  // Certificates
  // ==========================================================================
  {
    name: "private_key_pem",
    pattern: /privkey\.pem$/,
    category: "certificates",
    description: "Private key PEM file",
    allowRead: false,
  },
  {
    name: "server_key",
    pattern: /server\.key$/,
    category: "certificates",
    description: "Server private key",
    allowRead: false,
  },
];

/**
 * Messages for sensitive file operations
 */
export const SENSITIVE_FILE_MESSAGES = {
  BLOCKED_WRITE_TITLE: "Cannot modify sensitive file",
  BLOCKED_READ_TITLE: "Sensitive file detected",
  WARN_READ: "This file may contain secrets. Proceed with caution.",
  CATEGORY_DESCRIPTIONS: {
    environment: "Environment files often contain API keys and secrets",
    credentials: "Credential files contain sensitive authentication data",
    ssh_keys: "SSH keys provide access to remote systems",
    api_tokens: "API token configs may contain authentication credentials",
    certificates: "Certificate files contain cryptographic keys",
    cloud_config: "Cloud configuration files contain service credentials",
  } as Record<SensitiveFileCategory, string>,
  BLOCKED_REASON: "Modifying this file could expose or corrupt sensitive credentials.",
  READ_SUGGESTION: "If you need to debug credentials, review the file manually.",
  WRITE_SUGGESTION: "To modify credentials, edit the file manually outside of CodeTyper.",
};
