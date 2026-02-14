/**
 * Keybind Resolver
 *
 * Parses keybind strings (e.g., "ctrl+c", "<leader>m", "shift+return,ctrl+return"),
 * expands leader-key prefixes, and matches incoming key events against configured bindings.
 *
 * Keybind string format:
 *   - "ctrl+c"          → single combo
 *   - "ctrl+c,ctrl+d"   → two alternatives (either triggers)
 *   - "<leader>m"        → leader prefix + key (expands based on configured leader)
 *   - "none"             → binding disabled
 *   - "escape"           → single key without modifiers
 */

import fs from "fs/promises";
import { FILES } from "@constants/paths";
import {
  DEFAULT_KEYBINDS,
  DEFAULT_LEADER,
  type KeybindAction,
} from "@constants/keybinds";

// ============================================================================
// Types
// ============================================================================

/** A single parsed key combination */
export interface ParsedCombo {
  key: string;
  ctrl: boolean;
  alt: boolean;
  shift: boolean;
  meta: boolean;
}

/** A resolved keybinding: one action → one or more alternative combos */
export interface ResolvedKeybind {
  action: KeybindAction;
  combos: ParsedCombo[];
  raw: string;
}

/** The incoming key event from the TUI framework */
export interface KeyEvent {
  name: string;
  ctrl?: boolean;
  alt?: boolean;
  shift?: boolean;
  meta?: boolean;
}

/** User-provided overrides (partial, only the actions they want to change) */
export type KeybindOverrides = Partial<Record<KeybindAction, string>>;

/** Full resolved keybind map */
export type ResolvedKeybindMap = Map<KeybindAction, ResolvedKeybind>;

// ============================================================================
// Parsing
// ============================================================================

/**
 * Expand `<leader>` references in a keybind string.
 * E.g., with leader="ctrl+x":
 *   "<leader>m"  → "ctrl+x+m"
 *   "<leader>q"  → "ctrl+x+q"
 */
const expandLeader = (raw: string, leader: string): string => {
  return raw.replace(/<leader>/gi, `${leader}+`);
};

/**
 * Parse a single key combo string like "ctrl+shift+s" into a ParsedCombo.
 */
const parseCombo = (combo: string): ParsedCombo => {
  const parts = combo
    .trim()
    .toLowerCase()
    .split("+")
    .map((p) => p.trim())
    .filter(Boolean);

  const result: ParsedCombo = {
    key: "",
    ctrl: false,
    alt: false,
    shift: false,
    meta: false,
  };

  for (const part of parts) {
    switch (part) {
      case "ctrl":
      case "control":
        result.ctrl = true;
        break;
      case "alt":
      case "option":
        result.alt = true;
        break;
      case "shift":
        result.shift = true;
        break;
      case "meta":
      case "cmd":
      case "super":
      case "win":
        result.meta = true;
        break;
      default:
        // Last non-modifier part is the key name
        result.key = part;
        break;
    }
  }

  return result;
};

/**
 * Parse a full keybind string (possibly comma-separated) into an array of combos.
 * Returns empty array for "none" (disabled binding).
 */
const parseKeybindString = (
  raw: string,
  leader: string,
): ParsedCombo[] => {
  const trimmed = raw.trim().toLowerCase();
  if (trimmed === "none" || trimmed === "") return [];

  const expanded = expandLeader(raw, leader);
  const alternatives = expanded.split(",");

  return alternatives
    .map((alt) => parseCombo(alt))
    .filter((combo) => combo.key !== "");
};

// ============================================================================
// Matching
// ============================================================================

/**
 * Check if a key event matches a parsed combo.
 */
const matchesCombo = (event: KeyEvent, combo: ParsedCombo): boolean => {
  const eventKey = event.name?.toLowerCase() ?? "";
  if (eventKey !== combo.key) return false;
  if (!!event.ctrl !== combo.ctrl) return false;
  if (!!event.alt !== combo.alt) return false;
  if (!!event.shift !== combo.shift) return false;
  if (!!event.meta !== combo.meta) return false;
  return true;
};

// ============================================================================
// Resolver State
// ============================================================================

let resolvedMap: ResolvedKeybindMap = new Map();
let currentLeader: string = DEFAULT_LEADER;
let initialized = false;

/**
 * Build the resolved keybind map from defaults + overrides.
 */
const buildResolvedMap = (
  leader: string,
  overrides: KeybindOverrides,
): ResolvedKeybindMap => {
  const map = new Map<KeybindAction, ResolvedKeybind>();

  const merged = { ...DEFAULT_KEYBINDS, ...overrides };

  for (const [action, raw] of Object.entries(merged)) {
    const combos = parseKeybindString(raw, leader);
    map.set(action as KeybindAction, {
      action: action as KeybindAction,
      combos,
      raw,
    });
  }

  return map;
};

// ============================================================================
// Public API
// ============================================================================

/**
 * Initialize the keybind resolver.
 * Loads user overrides from keybindings.json if it exists.
 */
export const initializeKeybinds = async (): Promise<void> => {
  let overrides: KeybindOverrides = {};
  let leader = DEFAULT_LEADER;

  try {
    const data = await fs.readFile(FILES.keybindings, "utf-8");
    const parsed = JSON.parse(data) as Record<string, unknown>;

    if (typeof parsed.leader === "string") {
      leader = parsed.leader;
    }

    // Extract keybind overrides (anything that's not "leader")
    for (const [key, value] of Object.entries(parsed)) {
      if (key === "leader") continue;
      if (typeof value === "string") {
        overrides[key as KeybindAction] = value;
      }
    }
  } catch {
    // File doesn't exist or is invalid — use defaults only
  }

  currentLeader = leader;
  resolvedMap = buildResolvedMap(leader, overrides);
  initialized = true;
};

/**
 * Re-initialize with explicit overrides (for programmatic use).
 */
export const setKeybindOverrides = (
  overrides: KeybindOverrides,
  leader?: string,
): void => {
  currentLeader = leader ?? currentLeader;
  resolvedMap = buildResolvedMap(currentLeader, overrides);
  initialized = true;
};

/**
 * Check if a key event matches a specific action.
 */
export const matchesAction = (
  event: KeyEvent,
  action: KeybindAction,
): boolean => {
  if (!initialized) {
    // Lazy init with defaults if not yet initialized
    resolvedMap = buildResolvedMap(DEFAULT_LEADER, {});
    initialized = true;
  }

  const resolved = resolvedMap.get(action);
  if (!resolved) return false;

  return resolved.combos.some((combo) => matchesCombo(event, combo));
};

/**
 * Find which action(s) a key event matches.
 * Returns all matching actions (there may be overlaps).
 */
export const findMatchingActions = (event: KeyEvent): KeybindAction[] => {
  if (!initialized) {
    resolvedMap = buildResolvedMap(DEFAULT_LEADER, {});
    initialized = true;
  }

  const matches: KeybindAction[] = [];

  for (const [action, resolved] of resolvedMap) {
    if (resolved.combos.some((combo) => matchesCombo(event, combo))) {
      matches.push(action);
    }
  }

  return matches;
};

/**
 * Get the resolved keybind for an action (for display in help menus).
 */
export const getKeybindDisplay = (action: KeybindAction): string => {
  if (!initialized) {
    resolvedMap = buildResolvedMap(DEFAULT_LEADER, {});
    initialized = true;
  }

  const resolved = resolvedMap.get(action);
  if (!resolved || resolved.combos.length === 0) return "none";

  return resolved.combos
    .map((combo) => formatCombo(combo))
    .join(" / ");
};

/**
 * Format a parsed combo back to a human-readable string.
 * E.g., { ctrl: true, key: "c" } → "Ctrl+C"
 */
const formatCombo = (combo: ParsedCombo): string => {
  const parts: string[] = [];
  if (combo.ctrl) parts.push("Ctrl");
  if (combo.alt) parts.push("Alt");
  if (combo.shift) parts.push("Shift");
  if (combo.meta) parts.push("Cmd");

  const keyDisplay =
    combo.key.length === 1
      ? combo.key.toUpperCase()
      : combo.key === "return"
        ? "Enter"
        : combo.key === "escape"
          ? "Esc"
          : combo.key.charAt(0).toUpperCase() + combo.key.slice(1);

  parts.push(keyDisplay);
  return parts.join("+");
};

/**
 * Get all resolved keybinds (for help display or debugging).
 */
export const getAllKeybinds = (): ResolvedKeybind[] => {
  if (!initialized) {
    resolvedMap = buildResolvedMap(DEFAULT_LEADER, {});
    initialized = true;
  }
  return Array.from(resolvedMap.values());
};

/**
 * Get the current leader key string.
 */
export const getLeader = (): string => currentLeader;

/**
 * Save current keybind overrides to keybindings.json.
 */
export const saveKeybindOverrides = async (
  overrides: KeybindOverrides,
  leader?: string,
): Promise<void> => {
  const { mkdir, writeFile } = await import("fs/promises");
  const { dirname } = await import("path");

  const filepath = FILES.keybindings;
  await mkdir(dirname(filepath), { recursive: true });

  const data: Record<string, string> = {};
  if (leader) data.leader = leader;

  for (const [action, value] of Object.entries(overrides)) {
    data[action] = value;
  }

  await writeFile(filepath, JSON.stringify(data, null, 2), "utf-8");
};
