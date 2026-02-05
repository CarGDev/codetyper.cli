import { createSignal, createMemo, For, Show } from "solid-js";
import { useKeyboard } from "@opentui/solid";
import { TextAttributes } from "@opentui/core";
import { useTheme } from "@tui-solid/context/theme";
import { useAppStore } from "@tui-solid/context/app";
import type { ProviderStatus } from "@services/cascading-provider/availability";

interface ProviderOption {
  id: string;
  name: string;
  description: string;
  status: ProviderStatus;
  score?: number;
}

interface ProviderSelectProps {
  onSelect: (providerId: string) => Promise<void> | void;
  onClose: () => void;
  onToggleCascade?: () => void;
  isActive?: boolean;
  cascadeEnabled?: boolean;
  providerStatuses?: Record<string, ProviderStatus>;
  providerScores?: Record<string, number>;
}

const DEFAULT_PROVIDERS: Array<{
  id: string;
  name: string;
  description: string;
}> = [
  {
    id: "ollama",
    name: "Ollama",
    description: "Local LLM - fast, private, no API costs",
  },
  {
    id: "copilot",
    name: "Copilot",
    description: "GitHub Copilot - cloud-based, high quality",
  },
];

export function ProviderSelect(props: ProviderSelectProps) {
  const theme = useTheme();
  const app = useAppStore();
  const isActive = () => props.isActive ?? true;

  const [selectedIndex, setSelectedIndex] = createSignal(0);

  const providers = createMemo((): ProviderOption[] => {
    return DEFAULT_PROVIDERS.map((p) => ({
      ...p,
      status: props.providerStatuses?.[p.id] ?? {
        available: true,
        lastChecked: Date.now(),
      },
      score: props.providerScores?.[p.id],
    }));
  });

  const getStatusColor = (status: ProviderStatus): string => {
    if (status.available) {
      return theme.colors.success;
    }
    return theme.colors.error;
  };

  const getStatusText = (status: ProviderStatus): string => {
    if (status.available) {
      return "● Available";
    }
    return "○ Unavailable";
  };

  const getScoreColor = (score?: number): string => {
    if (score === undefined) return theme.colors.textDim;
    if (score >= 0.85) return theme.colors.success;
    if (score >= 0.6) return theme.colors.warning;
    return theme.colors.error;
  };

  const formatScore = (score?: number): string => {
    if (score === undefined) return "N/A";
    return `${Math.round(score * 100)}%`;
  };

  useKeyboard((evt) => {
    if (!isActive()) return;

    if (evt.name === "escape") {
      props.onClose();
      evt.preventDefault();
      evt.stopPropagation();
      return;
    }

    if (evt.name === "return") {
      const selected = providers()[selectedIndex()];
      if (selected && selected.status.available) {
        // For Ollama, let the handler manage the mode transition to model_select
        // For other providers, close after selection
        const result = props.onSelect(selected.id);
        if (result instanceof Promise) {
          result.then(() => {
            // Only close if not ollama (ollama opens model_select)
            if (selected.id !== "ollama") {
              props.onClose();
            }
          });
        } else if (selected.id !== "ollama") {
          props.onClose();
        }
      }
      evt.preventDefault();
      return;
    }

    if (evt.name === "up") {
      setSelectedIndex((prev) => {
        return prev > 0 ? prev - 1 : providers().length - 1;
      });
      evt.preventDefault();
      return;
    }

    if (evt.name === "down") {
      setSelectedIndex((prev) => {
        return prev < providers().length - 1 ? prev + 1 : 0;
      });
      evt.preventDefault();
      return;
    }

    if (evt.name === "c" && !evt.ctrl && !evt.meta) {
      props.onToggleCascade?.();
      evt.preventDefault();
      return;
    }
  });

  return (
    <box
      flexDirection="column"
      borderColor={theme.colors.accent}
      border={["top", "bottom", "left", "right"]}
      backgroundColor={theme.colors.background}
      paddingLeft={1}
      paddingRight={1}
    >
      <box marginBottom={1} flexDirection="row">
        <text fg={theme.colors.accent} attributes={TextAttributes.BOLD}>
          Select Provider
        </text>
      </box>

      <box marginBottom={1} flexDirection="row">
        <text fg={theme.colors.textDim}>Current: </text>
        <text fg={theme.colors.primary}>{app.provider()}</text>
      </box>

      <box marginBottom={1} flexDirection="row">
        <text fg={theme.colors.textDim}>Cascade Mode: </text>
        <text
          fg={props.cascadeEnabled ? theme.colors.success : theme.colors.error}
        >
          {props.cascadeEnabled ? "Enabled" : "Disabled"}
        </text>
        <text fg={theme.colors.textDim}> (press 'c' to toggle)</text>
      </box>

      <box flexDirection="column">
        <For each={providers()}>
          {(provider, index) => {
            const isSelected = () => index() === selectedIndex();
            const isCurrent = () => provider.id === app.provider();
            const isAvailable = () => provider.status.available;

            return (
              <box flexDirection="column" marginBottom={1}>
                <box flexDirection="row">
                  <text
                    fg={
                      isSelected()
                        ? theme.colors.accent
                        : isAvailable()
                          ? undefined
                          : theme.colors.textDim
                    }
                    attributes={
                      isSelected() ? TextAttributes.BOLD : TextAttributes.NONE
                    }
                  >
                    {isSelected() ? "> " : "  "}
                  </text>
                  <text
                    fg={
                      isSelected()
                        ? theme.colors.accent
                        : isAvailable()
                          ? undefined
                          : theme.colors.textDim
                    }
                    attributes={
                      isSelected() ? TextAttributes.BOLD : TextAttributes.NONE
                    }
                  >
                    {provider.name}
                  </text>
                  <text fg={getStatusColor(provider.status)}>
                    {" "}
                    {getStatusText(provider.status)}
                  </text>
                  <Show when={isCurrent()}>
                    <text fg={theme.colors.success}> (current)</text>
                  </Show>
                </box>
                <box flexDirection="row" marginLeft={4}>
                  <text fg={theme.colors.textDim}>{provider.description}</text>
                </box>
                <Show
                  when={
                    provider.id === "ollama" && provider.score !== undefined
                  }
                >
                  <box flexDirection="row" marginLeft={4}>
                    <text fg={theme.colors.textDim}>Quality Score: </text>
                    <text fg={getScoreColor(provider.score)}>
                      {formatScore(provider.score)}
                    </text>
                  </box>
                </Show>
              </box>
            );
          }}
        </For>
      </box>

      <box marginTop={1} flexDirection="column">
        <Show when={props.cascadeEnabled}>
          <text fg={theme.colors.info}>
            Cascade: Ollama runs first, Copilot audits for quality
          </text>
        </Show>
        <text fg={theme.colors.textDim}>
          ↑↓ navigate | Enter select | c toggle cascade | Esc close
        </text>
      </box>
    </box>
  );
}
