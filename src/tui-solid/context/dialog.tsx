import { type Accessor, type JSX } from "solid-js";
import { createStore, produce } from "solid-js/store";
import { createSimpleContext } from "./helper";

export type DialogType = "confirm" | "alert" | "custom";

export interface DialogConfig {
  id: string;
  type: DialogType;
  title: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm?: () => void;
  onCancel?: () => void;
  content?: () => JSX.Element;
}

interface DialogStore {
  dialogs: DialogConfig[];
  activeDialogId: string | null;
}

interface DialogContextValue {
  dialogs: Accessor<DialogConfig[]>;
  activeDialog: Accessor<DialogConfig | null>;
  isOpen: Accessor<boolean>;
  open: (config: Omit<DialogConfig, "id">) => string;
  close: (id?: string) => void;
  closeAll: () => void;
  confirm: (config: Omit<DialogConfig, "id" | "type">) => Promise<boolean>;
  alert: (title: string, message?: string) => Promise<void>;
}

let dialogIdCounter = 0;
const generateDialogId = (): string => `dialog-${++dialogIdCounter}`;

export const { provider: DialogProvider, use: useDialog } =
  createSimpleContext<DialogContextValue>({
    name: "Dialog",
    init: () => {
      const [store, setStore] = createStore<DialogStore>({
        dialogs: [],
        activeDialogId: null,
      });

      const dialogs = (): DialogConfig[] => store.dialogs;

      const activeDialog = (): DialogConfig | null => {
        if (!store.activeDialogId) return null;
        return store.dialogs.find((d) => d.id === store.activeDialogId) ?? null;
      };

      const isOpen = (): boolean => store.activeDialogId !== null;

      const open = (config: Omit<DialogConfig, "id">): string => {
        const id = generateDialogId();
        const dialog: DialogConfig = { ...config, id };
        setStore(
          produce((s) => {
            s.dialogs.push(dialog);
            s.activeDialogId = id;
          }),
        );
        return id;
      };

      const close = (id?: string): void => {
        const targetId = id ?? store.activeDialogId;
        if (!targetId) return;

        setStore(
          produce((s) => {
            s.dialogs = s.dialogs.filter((d) => d.id !== targetId);
            if (s.activeDialogId === targetId) {
              s.activeDialogId =
                s.dialogs.length > 0
                  ? s.dialogs[s.dialogs.length - 1].id
                  : null;
            }
          }),
        );
      };

      const closeAll = (): void => {
        setStore({ dialogs: [], activeDialogId: null });
      };

      const confirm = (
        config: Omit<DialogConfig, "id" | "type">,
      ): Promise<boolean> => {
        return new Promise((resolve) => {
          open({
            ...config,
            type: "confirm",
            onConfirm: () => {
              config.onConfirm?.();
              resolve(true);
            },
            onCancel: () => {
              config.onCancel?.();
              resolve(false);
            },
          });
        });
      };

      const alert = (title: string, message?: string): Promise<void> => {
        return new Promise((resolve) => {
          open({
            type: "alert",
            title,
            message,
            onConfirm: () => resolve(),
          });
        });
      };

      return {
        dialogs,
        activeDialog,
        isOpen,
        open,
        close,
        closeAll,
        confirm,
        alert,
      };
    },
  });
