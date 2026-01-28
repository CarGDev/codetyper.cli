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

const SCOPE_OPTIONS: Array<{
  key: string;
  label: string;
  scope: PermissionScope;
}> = [
  { key: "y", label: "Yes, this once", scope: "once" },
  { key: "s", label: "Yes, for this session", scope: "session" },
  { key: "a", label: "Always allow for this project", scope: "local" },
  { key: "g", label: "Always allow globally", scope: "global" },
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

    if (evt.name === "up") {
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : SCOPE_OPTIONS.length));
      evt.preventDefault();
      return;
    }

    if (evt.name === "down") {
      setSelectedIndex((prev) => (prev < SCOPE_OPTIONS.length ? prev + 1 : 0));
      evt.preventDefault();
      return;
    }

    if (evt.name === "return") {
      if (selectedIndex() === SCOPE_OPTIONS.length) {
        handleResponse(false);
      } else {
        const option = SCOPE_OPTIONS[selectedIndex()];
        handleResponse(true, option.scope);
      }
      evt.preventDefault();
      return;
    }

    if (evt.name === "escape" || evt.name === "n") {
      handleResponse(false);
      evt.preventDefault();
      return;
    }

    if (evt.name.length === 1) {
      const charLower = evt.name.toLowerCase();
      const optionIndex = SCOPE_OPTIONS.findIndex((o) => o.key === charLower);
      if (optionIndex !== -1) {
        const option = SCOPE_OPTIONS[optionIndex];
        handleResponse(true, option.scope);
        evt.preventDefault();
      }
    }
  });

  return (
    <box
      flexDirection="column"
      borderColor={theme.colors.borderWarning}
      border={["top", "bottom", "left", "right"]}
      backgroundColor={theme.colors.background}
      paddingLeft={2}
      paddingRight={2}
      paddingTop={1}
      paddingBottom={1}
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
        <For each={SCOPE_OPTIONS}>
          {(option, index) => {
            const isSelected = () => index() === selectedIndex();
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
                <text fg={theme.colors.success}>[{option.key}] </text>
                <text fg={isSelected() ? theme.colors.primary : undefined}>
                  {option.label}
                </text>
              </box>
            );
          }}
        </For>
        <box flexDirection="row">
          <text
            fg={
              selectedIndex() === SCOPE_OPTIONS.length
                ? theme.colors.primary
                : undefined
            }
            attributes={
              selectedIndex() === SCOPE_OPTIONS.length
                ? TextAttributes.BOLD
                : TextAttributes.NONE
            }
          >
            {selectedIndex() === SCOPE_OPTIONS.length ? "> " : "  "}
          </text>
          <text fg={theme.colors.error}>[n] </text>
          <text
            fg={
              selectedIndex() === SCOPE_OPTIONS.length
                ? theme.colors.primary
                : undefined
            }
          >
            No, deny this request
          </text>
        </box>
      </box>

      <box marginTop={1}>
        <text fg={theme.colors.textDim}>
          ↑↓ navigate | Enter select | Press shortcut key
        </text>
      </box>
    </box>
  );
}
