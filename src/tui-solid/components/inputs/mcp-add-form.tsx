import { createSignal, Show } from "solid-js";
import { useKeyboard } from "@opentui/solid";
import { TextAttributes } from "@opentui/core";
import { useTheme } from "@tui-solid/context/theme";
import type { MCPAddFormData } from "@/types/mcp";

interface MCPAddFormProps {
  onSubmit: (data: MCPAddFormData) => void;
  onClose: () => void;
  isActive?: boolean;
}

type FormField = "name" | "command" | "args" | "scope";

const FIELD_ORDER: FormField[] = ["name", "command", "args", "scope"];

const FIELD_LABELS: Record<FormField, string> = {
  name: "Server Name",
  command: "Command",
  args: "Arguments (use quotes for paths with spaces)",
  scope: "Scope",
};

const FIELD_PLACEHOLDERS: Record<FormField, string> = {
  name: "e.g., filesystem",
  command: "e.g., npx",
  args: "e.g., -y @modelcontextprotocol/server-filesystem \"/path/to/dir\"",
  scope: "",
};

export function MCPAddForm(props: MCPAddFormProps) {
  const theme = useTheme();
  const isActive = () => props.isActive ?? true;

  const [currentField, setCurrentField] = createSignal<FormField>("name");
  const [name, setName] = createSignal("");
  const [command, setCommand] = createSignal("");
  const [args, setArgs] = createSignal("");
  const [isGlobal, setIsGlobal] = createSignal(false);
  const [error, setError] = createSignal<string | null>(null);

  const getFieldValue = (field: FormField): string => {
    const fieldGetters: Record<FormField, () => string> = {
      name: name,
      command: command,
      args: args,
      scope: () => (isGlobal() ? "global" : "local"),
    };
    return fieldGetters[field]();
  };

  const setFieldValue = (field: FormField, value: string): void => {
    const fieldSetters: Record<FormField, (v: string) => void> = {
      name: setName,
      command: setCommand,
      args: setArgs,
      scope: () => setIsGlobal(value === "global"),
    };
    fieldSetters[field](value);
  };

  const handleSubmit = (): void => {
    setError(null);

    if (!name().trim()) {
      setError("Server name is required");
      setCurrentField("name");
      return;
    }

    if (!command().trim()) {
      setError("Command is required");
      setCurrentField("command");
      return;
    }

    props.onSubmit({
      name: name().trim(),
      command: command().trim(),
      args: args().trim(),
      isGlobal: isGlobal(),
    });
  };

  const moveToNextField = (): void => {
    const currentIndex = FIELD_ORDER.indexOf(currentField());
    if (currentIndex < FIELD_ORDER.length - 1) {
      setCurrentField(FIELD_ORDER[currentIndex + 1]);
    }
  };

  const moveToPrevField = (): void => {
    const currentIndex = FIELD_ORDER.indexOf(currentField());
    if (currentIndex > 0) {
      setCurrentField(FIELD_ORDER[currentIndex - 1]);
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

    if (evt.name === "return") {
      if (field === "scope") {
        handleSubmit();
      } else {
        moveToNextField();
      }
      evt.preventDefault();
      return;
    }

    if (evt.name === "tab") {
      if (evt.shift) {
        moveToPrevField();
      } else {
        moveToNextField();
      }
      evt.preventDefault();
      return;
    }

    if (evt.name === "up") {
      if (field === "scope") {
        setIsGlobal(!isGlobal());
      } else {
        moveToPrevField();
      }
      evt.preventDefault();
      return;
    }

    if (evt.name === "down") {
      if (field === "scope") {
        setIsGlobal(!isGlobal());
      } else {
        moveToNextField();
      }
      evt.preventDefault();
      return;
    }

    if (field === "scope") {
      if (evt.name === "space" || evt.name === "left" || evt.name === "right") {
        setIsGlobal(!isGlobal());
        evt.preventDefault();
      }
      return;
    }

    if (evt.name === "backspace" || evt.name === "delete") {
      const currentValue = getFieldValue(field);
      if (currentValue.length > 0) {
        setFieldValue(field, currentValue.slice(0, -1));
      }
      evt.preventDefault();
      return;
    }

    // Handle space key
    if (evt.name === "space") {
      setFieldValue(field, getFieldValue(field) + " ");
      setError(null);
      evt.preventDefault();
      return;
    }

    // Handle paste (Ctrl+V) - terminal paste usually comes as sequence of characters
    // but some terminals send the full pasted text as a single event
    if (evt.ctrl && evt.name === "v") {
      // Let the terminal handle paste - don't prevent default
      return;
    }

    // Handle regular character input
    if (evt.name.length === 1 && !evt.ctrl && !evt.meta) {
      setFieldValue(field, getFieldValue(field) + evt.name);
      setError(null);
      evt.preventDefault();
      return;
    }

    // Handle multi-character input (e.g., pasted text from terminal)
    if (evt.sequence && evt.sequence.length > 1 && !evt.ctrl && !evt.meta) {
      setFieldValue(field, getFieldValue(field) + evt.sequence);
      setError(null);
      evt.preventDefault();
    }
  });

  const renderField = (field: FormField) => {
    const isCurrentField = currentField() === field;
    const value = getFieldValue(field);
    const placeholder = FIELD_PLACEHOLDERS[field];

    if (field === "scope") {
      return (
        <box flexDirection="row" marginBottom={1}>
          <text
            fg={isCurrentField ? theme.colors.primary : theme.colors.text}
            attributes={isCurrentField ? TextAttributes.BOLD : TextAttributes.NONE}
          >
            {isCurrentField ? "> " : "  "}
            {FIELD_LABELS[field]}:{" "}
          </text>
          <text
            fg={!isGlobal() ? theme.colors.success : theme.colors.textDim}
            attributes={!isGlobal() && isCurrentField ? TextAttributes.BOLD : TextAttributes.NONE}
          >
            [Local]
          </text>
          <text fg={theme.colors.textDim}> / </text>
          <text
            fg={isGlobal() ? theme.colors.warning : theme.colors.textDim}
            attributes={isGlobal() && isCurrentField ? TextAttributes.BOLD : TextAttributes.NONE}
          >
            [Global]
          </text>
        </box>
      );
    }

    return (
      <box flexDirection="row" marginBottom={1}>
        <text
          fg={isCurrentField ? theme.colors.primary : theme.colors.text}
          attributes={isCurrentField ? TextAttributes.BOLD : TextAttributes.NONE}
        >
          {isCurrentField ? "> " : "  "}
          {FIELD_LABELS[field]}:{" "}
        </text>
        <Show
          when={value}
          fallback={
            <text fg={theme.colors.textDim}>
              {placeholder}
              {isCurrentField ? "_" : ""}
            </text>
          }
        >
          <text fg={theme.colors.text}>
            {value}
            {isCurrentField ? "_" : ""}
          </text>
        </Show>
      </box>
    );
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

      {renderField("name")}
      {renderField("command")}
      {renderField("args")}
      {renderField("scope")}

      <box marginTop={1} flexDirection="column">
        <text fg={theme.colors.textDim}>
          Tab/Enter next | Shift+Tab prev | ↑↓ navigate | Esc cancel
        </text>
        <text fg={theme.colors.textDim}>
          Enter on Scope to submit
        </text>
      </box>
    </box>
  );
}
