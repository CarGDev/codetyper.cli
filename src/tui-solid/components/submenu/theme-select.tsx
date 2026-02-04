import { createSignal, For } from "solid-js";
import { useKeyboard } from "@opentui/solid";
import { TextAttributes } from "@opentui/core";
import { useTheme } from "@tui-solid/context/theme";
import { THEME_NAMES } from "@constants/themes";

interface ThemeSelectProps {
  onSelect: (theme: string) => void;
  onClose: () => void;
  isActive?: boolean;
}

export function ThemeSelect(props: ThemeSelectProps) {
  const theme = useTheme();
  const isActive = () => props.isActive ?? true;
  const originalTheme = theme.themeName();
  const [selectedIndex, setSelectedIndex] = createSignal(
    THEME_NAMES.indexOf(theme.themeName()),
  );

  const previewTheme = (index: number): void => {
    const themeName = THEME_NAMES[index];
    if (themeName) {
      theme.setTheme(themeName);
    }
  };

  useKeyboard((evt) => {
    if (!isActive()) return;

    if (evt.name === "escape") {
      // Restore original theme on cancel
      theme.setTheme(originalTheme);
      props.onClose();
      evt.preventDefault();
      evt.stopPropagation();
      return;
    }

    if (evt.name === "return") {
      const selected = THEME_NAMES[selectedIndex()];
      if (selected) {
        props.onSelect(selected);
        props.onClose();
      }
      evt.preventDefault();
      return;
    }

    if (evt.name === "up") {
      const newIndex =
        selectedIndex() > 0 ? selectedIndex() - 1 : THEME_NAMES.length - 1;
      setSelectedIndex(newIndex);
      previewTheme(newIndex);
      evt.preventDefault();
      return;
    }

    if (evt.name === "down") {
      const newIndex =
        selectedIndex() < THEME_NAMES.length - 1 ? selectedIndex() + 1 : 0;
      setSelectedIndex(newIndex);
      previewTheme(newIndex);
      evt.preventDefault();
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
      <box marginBottom={1}>
        <text fg={theme.colors.accent} attributes={TextAttributes.BOLD}>
          Select Theme
        </text>
      </box>

      <For each={THEME_NAMES}>
        {(themeName, index) => {
          const isSelected = () => index() === selectedIndex();
          const isCurrent = () => themeName === theme.themeName();

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
                fg={isSelected() ? theme.colors.accent : undefined}
                attributes={
                  isSelected() ? TextAttributes.BOLD : TextAttributes.NONE
                }
              >
                {themeName}
              </text>
              {isCurrent() && <text fg={theme.colors.success}> (current)</text>}
            </box>
          );
        }}
      </For>

      <box marginTop={1}>
        <text fg={theme.colors.textDim}>
          ↑↓ navigate | Enter select | Esc close
        </text>
      </box>
    </box>
  );
}
