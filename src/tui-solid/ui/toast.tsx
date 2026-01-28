import {
  createContext,
  useContext,
  Show,
  type ParentProps,
  type Accessor,
} from "solid-js";
import { createStore } from "solid-js/store";
import { TextAttributes } from "@opentui/core";
import { useTheme } from "@tui-solid/context/theme";
import type { ThemeColors } from "@/types/theme";

export type ToastVariant = "info" | "success" | "warning" | "error";

export interface ToastOptions {
  message: string;
  title?: string;
  variant?: ToastVariant;
  duration?: number;
}

interface ToastStore {
  currentToast: ToastOptions | null;
}

interface ToastContextValue {
  show: (options: ToastOptions) => void;
  error: (err: unknown) => void;
  success: (message: string) => void;
  info: (message: string) => void;
  warning: (message: string) => void;
  hide: () => void;
  currentToast: ToastOptions | null;
}

const DEFAULT_DURATION = 3000;

const createToastContext = (): ToastContextValue => {
  const [store, setStore] = createStore<ToastStore>({
    currentToast: null,
  });

  let timeoutHandle: ReturnType<typeof setTimeout> | null = null;

  const show = (options: ToastOptions): void => {
    const duration = options.duration ?? DEFAULT_DURATION;
    setStore("currentToast", {
      ...options,
      variant: options.variant ?? "info",
    });

    if (timeoutHandle) {
      clearTimeout(timeoutHandle);
    }

    timeoutHandle = setTimeout(() => {
      setStore("currentToast", null);
    }, duration);
  };

  const error = (err: unknown): void => {
    const message =
      err instanceof Error ? err.message : "An unknown error occurred";
    show({ message, variant: "error" });
  };

  const success = (message: string): void => {
    show({ message, variant: "success" });
  };

  const info = (message: string): void => {
    show({ message, variant: "info" });
  };

  const warning = (message: string): void => {
    show({ message, variant: "warning" });
  };

  const hide = (): void => {
    if (timeoutHandle) {
      clearTimeout(timeoutHandle);
    }
    setStore("currentToast", null);
  };

  return {
    show,
    error,
    success,
    info,
    warning,
    hide,
    get currentToast() {
      return store.currentToast;
    },
  };
};

const ToastContext = createContext<ToastContextValue>();

export function ToastProvider(props: ParentProps) {
  const value = createToastContext();
  return (
    <ToastContext.Provider value={value}>
      {props.children}
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const value = useContext(ToastContext);
  if (!value) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return value;
}

const VARIANT_COLORS: Record<ToastVariant, keyof ThemeColors> = {
  info: "info",
  success: "success",
  warning: "warning",
  error: "error",
};

export function Toast() {
  const toast = useToast();
  const theme = useTheme();

  return (
    <Show when={toast.currentToast}>
      {(current: Accessor<ToastOptions>) => {
        const variant = current().variant ?? "info";
        const colorKey = VARIANT_COLORS[variant];
        const borderColorValue = theme.colors[colorKey];
        const borderColor =
          typeof borderColorValue === "string"
            ? borderColorValue
            : theme.colors.border;

        return (
          <box
            position="absolute"
            top={2}
            right={2}
            maxWidth={60}
            paddingLeft={2}
            paddingRight={2}
            paddingTop={1}
            paddingBottom={1}
            backgroundColor={theme.colors.backgroundPanel ?? "#1e1e1e"}
            borderColor={borderColor}
            border={["left", "right"]}
          >
            <Show when={current().title}>
              <text
                attributes={TextAttributes.BOLD}
                marginBottom={1}
                fg={theme.colors.text}
              >
                {current().title}
              </text>
            </Show>
            <text fg={theme.colors.text} wrapMode="word" width="100%">
              {current().message}
            </text>
          </box>
        );
      }}
    </Show>
  );
}

export function ToastContainer() {
  return (
    <box position="absolute">
      <Toast />
    </box>
  );
}
