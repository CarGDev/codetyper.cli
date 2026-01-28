import { createStore, produce } from "solid-js/store";
import { createSimpleContext } from "./helper";

export type KeyModifier = "ctrl" | "alt" | "shift" | "meta";

export interface KeyBinding {
  id: string;
  key: string;
  modifiers?: KeyModifier[];
  description: string;
  action: () => void;
  context?: string;
  enabled?: boolean;
}

export interface KeybindStore {
  bindings: Record<string, KeyBinding>;
  contextStack: string[];
}

interface KeybindContextValue {
  bindings: () => KeyBinding[];
  currentContext: () => string | null;
  pushContext: (context: string) => void;
  popContext: () => void;
  clearContexts: () => void;
  register: (binding: Omit<KeyBinding, "id">) => string;
  unregister: (id: string) => void;
  enable: (id: string) => void;
  disable: (id: string) => void;
  getBindingForKey: (
    key: string,
    modifiers: KeyModifier[],
  ) => KeyBinding | null;
  formatKeybind: (binding: KeyBinding) => string;
}

let keybindIdCounter = 0;
const generateKeybindId = (): string => `keybind-${++keybindIdCounter}`;

const normalizeKey = (key: string): string => key.toLowerCase();

const sortModifiers = (modifiers: KeyModifier[]): KeyModifier[] => {
  const order: KeyModifier[] = ["ctrl", "alt", "shift", "meta"];
  return [...modifiers].sort((a, b) => order.indexOf(a) - order.indexOf(b));
};

const createKeySignature = (
  key: string,
  modifiers: KeyModifier[] = [],
): string => {
  const sorted = sortModifiers(modifiers);
  return [...sorted, normalizeKey(key)].join("+");
};

export const { provider: KeybindProvider, use: useKeybind } =
  createSimpleContext<KeybindContextValue>({
    name: "Keybind",
    init: () => {
      const [store, setStore] = createStore<KeybindStore>({
        bindings: {},
        contextStack: [],
      });

      const bindings = (): KeyBinding[] => Object.values(store.bindings);

      const currentContext = (): string | null => {
        const stack = store.contextStack;
        return stack.length > 0 ? stack[stack.length - 1] : null;
      };

      const pushContext = (context: string): void => {
        setStore(
          produce((s) => {
            s.contextStack.push(context);
          }),
        );
      };

      const popContext = (): void => {
        setStore(
          produce((s) => {
            s.contextStack.pop();
          }),
        );
      };

      const clearContexts = (): void => {
        setStore("contextStack", []);
      };

      const register = (binding: Omit<KeyBinding, "id">): string => {
        const id = generateKeybindId();
        const fullBinding: KeyBinding = {
          ...binding,
          id,
          enabled: binding.enabled ?? true,
        };
        setStore("bindings", id, fullBinding);
        return id;
      };

      const unregister = (id: string): void => {
        setStore(
          produce((s) => {
            delete s.bindings[id];
          }),
        );
      };

      const enable = (id: string): void => {
        const binding = store.bindings[id];
        if (binding) {
          setStore("bindings", id, "enabled", true);
        }
      };

      const disable = (id: string): void => {
        const binding = store.bindings[id];
        if (binding) {
          setStore("bindings", id, "enabled", false);
        }
      };

      const getBindingForKey = (
        key: string,
        modifiers: KeyModifier[],
      ): KeyBinding | null => {
        const signature = createKeySignature(key, modifiers);
        const ctx = currentContext();

        for (const binding of Object.values(store.bindings)) {
          if (!binding.enabled) continue;

          const bindingSignature = createKeySignature(
            binding.key,
            binding.modifiers,
          );
          if (bindingSignature !== signature) continue;

          if (binding.context && binding.context !== ctx) continue;

          return binding;
        }

        return null;
      };

      const formatKeybind = (binding: KeyBinding): string => {
        const parts: string[] = [];

        if (binding.modifiers?.includes("ctrl")) parts.push("Ctrl");
        if (binding.modifiers?.includes("alt")) parts.push("Alt");
        if (binding.modifiers?.includes("shift")) parts.push("Shift");
        if (binding.modifiers?.includes("meta")) parts.push("Cmd");

        const keyDisplay =
          binding.key.length === 1 ? binding.key.toUpperCase() : binding.key;

        parts.push(keyDisplay);

        return parts.join("+");
      };

      return {
        bindings,
        currentContext,
        pushContext,
        popContext,
        clearContexts,
        register,
        unregister,
        enable,
        disable,
        getBindingForKey,
        formatKeybind,
      };
    },
  });
