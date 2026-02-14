import { createSignal, createMemo, Show } from "solid-js";
import { useKeyboard } from "@opentui/solid";
import { TextAttributes } from "@opentui/core";
import { useTheme } from "@tui-solid/context/theme";
import type { MCPAddFormData, MCPTransportType } from "@/types/mcp";

interface MCPAddFormProps {
  onSubmit: (data: MCPAddFormData) => void;
  onClose: () => void;
  isActive?: boolean;
}

/** All fields in order. The visible set depends on the selected transport. */
type FormField = "name" | "type" | "command" | "args" | "url" | "scope";

const TRANSPORT_OPTIONS: MCPTransportType[] = ["stdio", "http", "sse"];

const FIELD_LABELS: Record<FormField, string> = {
  name: "Server Name",
  type: "Transport",
  command: "Command",
  args: "Arguments",
  url: "URL",
  scope: "Scope",
};

const FIELD_PLACEHOLDERS: Record<FormField, string> = {
  name: "e.g., figma",
  type: "",
  command: "e.g., npx",
  args: 'e.g., -y @modelcontextprotocol/server-filesystem "/path"',
  url: "e.g., https://mcp.figma.com/mcp",
  scope: "",
};

export function MCPAddForm(props: MCPAddFormProps) {
  const theme = useTheme();
  const isActive = () => props.isActive ?? true;

  const [currentField, setCurrentField] = createSignal<FormField>("name");
  const [name, setName] = createSignal("");
  const [transport, setTransport] = createSignal<MCPTransportType>("http");
  const [command, setCommand] = createSignal("");
  const [args, setArgs] = createSignal("");
  const [url, setUrl] = createSignal("");
  const [isGlobal, setIsGlobal] = createSignal(false);
  const [error, setError] = createSignal<string | null>(null);

  /** Visible fields depend on the selected transport */
  const fieldOrder = createMemo((): FormField[] => {
    if (transport() === "stdio") {
      return ["name", "type", "command", "args", "scope"];
    }
    return ["name", "type", "url", "scope"];
  });

  const getFieldValue = (field: FormField): string => {
    const getters: Record<FormField, () => string> = {
      name,
      type: transport,
      command,
      args,
      url,
      scope: () => (isGlobal() ? "global" : "local"),
    };
    return getters[field]();
  };

  const setFieldValue = (field: FormField, value: string): void => {
    const setters: Record<FormField, (v: string) => void> = {
      name: setName,
      type: (v) => setTransport(v as MCPTransportType),
      command: setCommand,
      args: setArgs,
      url: setUrl,
      scope: () => setIsGlobal(value === "global"),
    };
    setters[field](value);
  };

  const handleSubmit = (): void => {
    setError(null);
    const n = name().trim();

    if (!n) {
      setError("Server name is required");
      setCurrentField("name");
      return;
    }

    if (transport() === "stdio") {
      if (!command().trim()) {
        setError("Command is required for stdio transport");
        setCurrentField("command");
        return;
      }
      props.onSubmit({
        name: n,
        type: "stdio",
        command: command().trim(),
        args: args().trim() || undefined,
        isGlobal: isGlobal(),
      });
    } else {
      if (!url().trim()) {
        setError("URL is required for http/sse transport");
        setCurrentField("url");
        return;
      }
      props.onSubmit({
        name: n,
        type: transport(),
        url: url().trim(),
        isGlobal: isGlobal(),
      });
    }
  };

  const moveToNextField = (): void => {
    const order = fieldOrder();
    const idx = order.indexOf(currentField());
    if (idx < order.length - 1) {
      setCurrentField(order[idx + 1]);
    }
  };

  const moveToPrevField = (): void => {
    const order = fieldOrder();
    const idx = order.indexOf(currentField());
    if (idx > 0) {
      setCurrentField(order[idx - 1]);
    }
  };

  /** Cycle through transport options */
  const cycleTransport = (direction: 1 | -1): void => {
    const idx = TRANSPORT_OPTIONS.indexOf(transport());
    const next =
      (idx + direction + TRANSPORT_OPTIONS.length) % TRANSPORT_OPTIONS.length;
    setTransport(TRANSPORT_OPTIONS[next]);

    // If the current field is no longer visible after switching, jump to next valid
    if (!fieldOrder().includes(currentField())) {
      setCurrentField("type");
    }
  };

  useKeyboard((evt) => {
    if (!isActive()) return;

    if (evt.name === "escape") {
      props.onClose();
      evt.preventDefault();
      evt.stopPropagation();
      return;
    }

    const field = currentField();

    // Enter — submit on last field, otherwise advance
    if (evt.name === "return") {
      if (field === "scope") {
        handleSubmit();
      } else {
        moveToNextField();
      }
      evt.preventDefault();
      return;
    }

    // Tab navigation
    if (evt.name === "tab") {
      if (evt.shift) moveToPrevField();
      else moveToNextField();
      evt.preventDefault();
      return;
    }

    // Up / Down
    if (evt.name === "up") {
      if (field === "scope") setIsGlobal(!isGlobal());
      else if (field === "type") cycleTransport(-1);
      else moveToPrevField();
      evt.preventDefault();
      return;
    }
    if (evt.name === "down") {
      if (field === "scope") setIsGlobal(!isGlobal());
      else if (field === "type") cycleTransport(1);
      else moveToNextField();
      evt.preventDefault();
      return;
    }

    // Left / Right / Space on selector fields
    if (field === "type") {
      if (
        evt.name === "space" ||
        evt.name === "left" ||
        evt.name === "right"
      ) {
        cycleTransport(evt.name === "left" ? -1 : 1);
        evt.preventDefault();
      }
      return;
    }

    if (field === "scope") {
      if (
        evt.name === "space" ||
        evt.name === "left" ||
        evt.name === "right"
      ) {
        setIsGlobal(!isGlobal());
        evt.preventDefault();
      }
      return;
    }

    // Backspace
    if (evt.name === "backspace" || evt.name === "delete") {
      const val = getFieldValue(field);
      if (val.length > 0) setFieldValue(field, val.slice(0, -1));
      evt.preventDefault();
      return;
    }

    // Space
    if (evt.name === "space") {
      setFieldValue(field, getFieldValue(field) + " ");
      setError(null);
      evt.preventDefault();
      return;
    }

    // Ctrl+V
    if (evt.ctrl && evt.name === "v") return;

    // Single char
    if (evt.name.length === 1 && !evt.ctrl && !evt.meta) {
      setFieldValue(field, getFieldValue(field) + evt.name);
      setError(null);
      evt.preventDefault();
      return;
    }

    // Pasted text
    if (evt.sequence && evt.sequence.length > 1 && !evt.ctrl && !evt.meta) {
      setFieldValue(field, getFieldValue(field) + evt.sequence);
      setError(null);
      evt.preventDefault();
    }
  });

  // ──────────── Renderers ────────────

  const renderTextField = (field: FormField) => {
    const isCurrent = currentField() === field;
    const value = getFieldValue(field);
    const placeholder = FIELD_PLACEHOLDERS[field];

    return (
      <box flexDirection="row" marginBottom={1}>
        <text
          fg={isCurrent ? theme.colors.primary : theme.colors.text}
          attributes={isCurrent ? TextAttributes.BOLD : TextAttributes.NONE}
        >
          {isCurrent ? "> " : "  "}
          {FIELD_LABELS[field]}:{" "}
        </text>
        <Show
          when={value}
          fallback={
            <text fg={theme.colors.textDim}>
              {placeholder}
              {isCurrent ? "_" : ""}
            </text>
          }
        >
          <text fg={theme.colors.text}>
            {value}
            {isCurrent ? "_" : ""}
          </text>
        </Show>
      </box>
    );
  };

  const renderTransportField = () => {
    const isCurrent = currentField() === "type";

    return (
      <box flexDirection="row" marginBottom={1}>
        <text
          fg={isCurrent ? theme.colors.primary : theme.colors.text}
          attributes={isCurrent ? TextAttributes.BOLD : TextAttributes.NONE}
        >
          {isCurrent ? "> " : "  "}
          {FIELD_LABELS.type}:{" "}
        </text>
        {TRANSPORT_OPTIONS.map((opt) => (
          <>
            <text
              fg={
                transport() === opt
                  ? theme.colors.success
                  : theme.colors.textDim
              }
              attributes={
                transport() === opt && isCurrent
                  ? TextAttributes.BOLD
                  : TextAttributes.NONE
              }
            >
              [{opt}]
            </text>
            <text fg={theme.colors.textDim}> </text>
          </>
        ))}
      </box>
    );
  };

  const renderScopeField = () => {
    const isCurrent = currentField() === "scope";

    return (
      <box flexDirection="row" marginBottom={1}>
        <text
          fg={isCurrent ? theme.colors.primary : theme.colors.text}
          attributes={isCurrent ? TextAttributes.BOLD : TextAttributes.NONE}
        >
          {isCurrent ? "> " : "  "}
          {FIELD_LABELS.scope}:{" "}
        </text>
        <text
          fg={!isGlobal() ? theme.colors.success : theme.colors.textDim}
          attributes={
            !isGlobal() && isCurrent ? TextAttributes.BOLD : TextAttributes.NONE
          }
        >
          [Local]
        </text>
        <text fg={theme.colors.textDim}> / </text>
        <text
          fg={isGlobal() ? theme.colors.warning : theme.colors.textDim}
          attributes={
            isGlobal() && isCurrent ? TextAttributes.BOLD : TextAttributes.NONE
          }
        >
          [Global]
        </text>
      </box>
    );
  };

  const renderField = (field: FormField) => {
    if (field === "type") return renderTransportField();
    if (field === "scope") return renderScopeField();
    return renderTextField(field);
  };

  return (
    <box
      flexDirection="column"
      borderColor={theme.colors.primary}
      border={["top", "bottom", "left", "right"]}
      backgroundColor={theme.colors.background}
      paddingLeft={1}
      paddingRight={1}
      paddingTop={1}
      paddingBottom={1}
    >
      <box marginBottom={1}>
        <text fg={theme.colors.primary} attributes={TextAttributes.BOLD}>
          Add MCP Server
        </text>
      </box>

      <Show when={error()}>
        <box marginBottom={1}>
          <text fg={theme.colors.error}>{error()}</text>
        </box>
      </Show>

      {fieldOrder().map((f) => renderField(f))}

      <box marginTop={1} flexDirection="column">
        <text fg={theme.colors.textDim}>
          Tab/Enter next | Shift+Tab prev | ←→ switch option | Esc cancel
        </text>
        <text fg={theme.colors.textDim}>Enter on Scope to submit</text>
      </box>
    </box>
  );
}
