import { createSignal, createMemo, For, Show } from "solid-js";
import { useKeyboard } from "@opentui/solid";
import { TextAttributes } from "@opentui/core";
import { useTheme } from "@tui-solid/context/theme";
import { useAppStore } from "@tui-solid/context/app";
import type { ProviderModel } from "@/types/providers";

interface ModelSelectProps {
  onSelect: (model: string) => void;
  onClose: () => void;
  isActive?: boolean;
}

const MAX_VISIBLE = 10;

const AUTO_MODEL: ProviderModel = {
  id: "auto",
  name: "Auto",
  supportsTools: true,
  supportsStreaming: true,
  costMultiplier: undefined,
  isUnlimited: true,
};

const formatCostMultiplier = (model: ProviderModel): string => {
  if (model.id === "auto") return "";

  const multiplier = model.costMultiplier;
  if (multiplier === undefined) {
    return "";
  }
  if (multiplier === 0 || model.isUnlimited) {
    return "Unlimited";
  }
  return `${multiplier}x`;
};

const getCostColor = (
  model: ProviderModel,
  theme: ReturnType<typeof useTheme>,
): string => {
  if (model.id === "auto") return theme.colors.textDim;

  const multiplier = model.costMultiplier;
  if (multiplier === undefined) {
    return theme.colors.textDim;
  }
  if (multiplier === 0 || model.isUnlimited) {
    return theme.colors.success;
  }
  if (multiplier <= 0.1) {
    return theme.colors.primary;
  }
  if (multiplier <= 1.0) {
    return theme.colors.warning;
  }
  return theme.colors.error;
};

export function ModelSelect(props: ModelSelectProps) {
  const theme = useTheme();
  const app = useAppStore();
  const isActive = () => props.isActive ?? true;

  const [selectedIndex, setSelectedIndex] = createSignal(0);
  const [scrollOffset, setScrollOffset] = createSignal(0);
  const [filter, setFilter] = createSignal("");

  const allModels = createMemo((): ProviderModel[] => {
    return [AUTO_MODEL, ...app.availableModels()];
  });

  const filteredModels = createMemo((): ProviderModel[] => {
    if (!filter()) return allModels();
    const query = filter().toLowerCase();
    return allModels().filter(
      (model) =>
        model.id.toLowerCase().includes(query) ||
        model.name.toLowerCase().includes(query),
    );
  });

  useKeyboard((evt) => {
    if (!isActive()) return;

    if (evt.name === "escape") {
      props.onClose();
      evt.preventDefault();
      evt.stopPropagation();
      return;
    }

    if (evt.name === "return") {
      const models = filteredModels();
      if (models.length > 0) {
        const selected = models[selectedIndex()];
        if (selected) {
          props.onSelect(selected.id);
          props.onClose();
        }
      }
      evt.preventDefault();
      return;
    }

    if (evt.name === "up") {
      const models = filteredModels();
      setSelectedIndex((prev) => {
        const newIndex = prev > 0 ? prev - 1 : models.length - 1;
        if (newIndex < scrollOffset()) {
          setScrollOffset(newIndex);
        }
        if (prev === 0 && newIndex === models.length - 1) {
          setScrollOffset(Math.max(0, models.length - MAX_VISIBLE));
        }
        return newIndex;
      });
      evt.preventDefault();
      return;
    }

    if (evt.name === "down") {
      const models = filteredModels();
      setSelectedIndex((prev) => {
        const newIndex = prev < models.length - 1 ? prev + 1 : 0;
        if (newIndex >= scrollOffset() + MAX_VISIBLE) {
          setScrollOffset(newIndex - MAX_VISIBLE + 1);
        }
        if (prev === models.length - 1 && newIndex === 0) {
          setScrollOffset(0);
        }
        return newIndex;
      });
      evt.preventDefault();
      return;
    }

    if (evt.name === "backspace" || evt.name === "delete") {
      if (filter().length > 0) {
        setFilter(filter().slice(0, -1));
        setSelectedIndex(0);
        setScrollOffset(0);
      }
      evt.preventDefault();
      return;
    }

    if (evt.name.length === 1 && !evt.ctrl && !evt.meta) {
      setFilter(filter() + evt.name);
      setSelectedIndex(0);
      setScrollOffset(0);
      evt.preventDefault();
    }
  });

  const visibleModels = createMemo(() =>
    filteredModels().slice(scrollOffset(), scrollOffset() + MAX_VISIBLE),
  );

  const hasMoreAbove = () => scrollOffset() > 0;
  const hasMoreBelow = () =>
    scrollOffset() + MAX_VISIBLE < filteredModels().length;
  const moreAboveCount = () => scrollOffset();
  const moreBelowCount = () =>
    filteredModels().length - scrollOffset() - MAX_VISIBLE;

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
          Select Model
        </text>
        <Show when={filter()}>
          <text fg={theme.colors.textDim}> - filtering: </text>
          <text fg={theme.colors.warning}>{filter()}</text>
        </Show>
      </box>

      <box marginBottom={1} flexDirection="row">
        <text fg={theme.colors.textDim}>Current: </text>
        <text fg={theme.colors.primary}>{app.model()}</text>
      </box>

      <Show
        when={filteredModels().length > 0}
        fallback={
          <text fg={theme.colors.textDim}>No models match "{filter()}"</text>
        }
      >
        <box flexDirection="column">
          <Show when={hasMoreAbove()}>
            <text fg={theme.colors.textDim}>
              {" "}
              ↑ {moreAboveCount()} more above
            </text>
          </Show>

          <For each={visibleModels()}>
            {(model, visibleIndex) => {
              const actualIndex = () => scrollOffset() + visibleIndex();
              const isSelected = () => actualIndex() === selectedIndex();
              const isCurrent = () => model.id === app.model();
              const isAuto = () => model.id === "auto";
              const costLabel = () => formatCostMultiplier(model);
              const costColor = () => getCostColor(model, theme);

              return (
                <box flexDirection="row">
                  <text
                    fg={isSelected() ? theme.colors.accent : undefined}
                    attributes={
                      isSelected() ? TextAttributes.BOLD : TextAttributes.NONE
                    }
                  >
                    {isSelected() ? "> " : "  "}
                  </text>
                  <text
                    fg={
                      isAuto()
                        ? theme.colors.warning
                        : isSelected()
                          ? theme.colors.accent
                          : undefined
                    }
                    attributes={
                      isSelected() || isAuto()
                        ? TextAttributes.BOLD
                        : TextAttributes.NONE
                    }
                  >
                    {model.id}
                  </text>
                  <Show when={costLabel() && !isAuto()}>
                    <text fg={costColor()}> [{costLabel()}]</text>
                  </Show>
                  <Show when={isCurrent()}>
                    <text fg={theme.colors.success}> (current)</text>
                  </Show>
                  <Show when={isAuto()}>
                    <text fg={theme.colors.textDim}>
                      {" "}
                      - Let Copilot choose the best model
                    </text>
                  </Show>
                </box>
              );
            }}
          </For>

          <Show when={hasMoreBelow()}>
            <text fg={theme.colors.textDim}>
              {" "}
              ↓ {moreBelowCount()} more below
            </text>
          </Show>
        </box>
      </Show>

      <box marginTop={1} flexDirection="column">
        <box flexDirection="row">
          <text fg={theme.colors.textDim}>Cost: </text>
          <text fg={theme.colors.success}>Unlimited</text>
          <text fg={theme.colors.textDim}> | </text>
          <text fg={theme.colors.primary}>Low</text>
          <text fg={theme.colors.textDim}> | </text>
          <text fg={theme.colors.warning}>Standard</text>
          <text fg={theme.colors.textDim}> | </text>
          <text fg={theme.colors.error}>Premium</text>
        </box>
        <text fg={theme.colors.textDim}>
          ↑↓ navigate | Enter select | Type to filter | Esc close
        </text>
      </box>
    </box>
  );
}
