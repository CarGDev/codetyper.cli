import { createSignal, Show, For } from "solid-js";
import { useKeyboard } from "@opentui/solid";
import { TextAttributes } from "@opentui/core";
import { useTheme } from "@tui-solid/context/theme";
import type { PermissionRequest, PermissionScope } from "@/types/tui";

interface PermissionModalProps {
  request: PermissionRequest;
  onRespond?: (allowed: boolean, scope?: PermissionScope) => void;
  isActive?: boolean;
}

interface PermissionOption {
  key: string;
  label: string;
  scope: PermissionScope | "deny";
  allowed: boolean;
}

const PERMISSION_OPTIONS: PermissionOption[] = [
  { key: "y", label: "Yes, this once", scope: "once", allowed: true },
  { key: "s", label: "Yes, for this session", scope: "session", allowed: true },
  { key: "l", label: "Yes, for this project", scope: "local", allowed: true },
  { key: "g", label: "Yes, globally", scope: "global", allowed: true },
  { key: "n", label: "No, deny this request", scope: "deny", allowed: false },
];

export function PermissionModal(props: PermissionModalProps) {
  const theme = useTheme();
  const [selectedIndex, setSelectedIndex] = createSignal(0);
  const isActive = () => props.isActive ?? true;

  const handleResponse = (allowed: boolean, scope?: PermissionScope): void => {
    // Call the resolve function on the request to complete the permission prompt
    if (props.request.resolve) {
      props.request.resolve({ allowed, scope });
    }
    // Also call the onRespond callback for UI state updates
    props.onRespond?.(allowed, scope);
  };

  useKeyboard((evt) => {
    if (!isActive()) return;

    // Stop propagation for all events when modal is active
    evt.stopPropagation();

    if (evt.name === "up") {
      setSelectedIndex((prev) =>
        prev > 0 ? prev - 1 : PERMISSION_OPTIONS.length - 1,
      );
      evt.preventDefault();
      return;
    }

    if (evt.name === "down") {
      setSelectedIndex((prev) =>
        prev < PERMISSION_OPTIONS.length - 1 ? prev + 1 : 0,
      );
      evt.preventDefault();
      return;
    }

    if (evt.name === "return") {
      const option = PERMISSION_OPTIONS[selectedIndex()];
      if (option.allowed && option.scope !== "deny") {
        handleResponse(true, option.scope as PermissionScope);
      } else {
        handleResponse(false);
      }
      evt.preventDefault();
      return;
    }

    if (evt.name === "escape") {
      handleResponse(false);
      evt.preventDefault();
      return;
    }

    // Handle shortcut keys
    if (evt.name.length === 1 && !evt.ctrl && !evt.meta) {
      const charLower = evt.name.toLowerCase();
      const optionIndex = PERMISSION_OPTIONS.findIndex(
        (o) => o.key === charLower,
      );
      if (optionIndex !== -1) {
        const option = PERMISSION_OPTIONS[optionIndex];
        if (option.allowed && option.scope !== "deny") {
          handleResponse(true, option.scope as PermissionScope);
        } else {
          handleResponse(false);
        }
        evt.preventDefault();
      }
    }
  });

  return (
    <box
      flexDirection="column"
      borderColor={theme.colors.borderWarning}
      border={["top"]}
      backgroundColor={theme.colors.background}
      paddingLeft={2}
      paddingRight={2}
      paddingTop={1}
      paddingBottom={1}
      width="100%"
      height="auto"
      flexShrink={0}
    >
      <box marginBottom={1}>
        <text fg={theme.colors.warning} attributes={TextAttributes.BOLD}>
          ⚠ Permission Required
        </text>
      </box>

      <box flexDirection="column" marginBottom={1}>
        <text fg={theme.colors.text}>
          {props.request.type.toUpperCase()}: {props.request.description}
        </text>
        <Show when={props.request.command}>
          <box marginTop={1}>
            <text fg={theme.colors.textDim}>Command: </text>
            <text fg={theme.colors.primary}>{props.request.command}</text>
          </box>
        </Show>
        <Show when={props.request.path}>
          <box marginTop={1}>
            <text fg={theme.colors.textDim}>Path: </text>
            <text fg={theme.colors.primary}>{props.request.path}</text>
          </box>
        </Show>
      </box>

      <box flexDirection="column" marginTop={1}>
        <For each={PERMISSION_OPTIONS}>
          {(option, index) => {
            const isSelected = () => index() === selectedIndex();
            const keyColor = () =>
              option.allowed ? theme.colors.success : theme.colors.error;
            return (
              <box flexDirection="row">
                <text
                  fg={isSelected() ? theme.colors.primary : undefined}
                  attributes={
                    isSelected() ? TextAttributes.BOLD : TextAttributes.NONE
                  }
                >
                  {isSelected() ? "> " : "  "}
                </text>
                <text fg={keyColor()}>[{option.key}] </text>
                <text fg={isSelected() ? theme.colors.primary : undefined}>
                  {option.label}
                </text>
              </box>
            );
          }}
        </For>
      </box>

      <box marginTop={1}>
        <text fg={theme.colors.textDim}>
          ↑↓ navigate | Enter select | Press shortcut key
        </text>
      </box>
    </box>
  );
}
