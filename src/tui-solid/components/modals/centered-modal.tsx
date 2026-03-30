import { JSXElement } from "solid-js";
import { useKeyboard } from "@opentui/solid";
import { useTheme } from "@tui-solid/context/theme";

interface CenteredModalProps {
  children: JSXElement;
}

/**
 * A container that centers its children in the terminal window.
 * Uses absolute positioning with flexbox centering.
 * Blocks keyboard events from reaching underlying components.
 */
export function CenteredModal(props: CenteredModalProps) {
  const theme = useTheme();

  // Block all keyboard events from propagating to components behind the modal
  useKeyboard((evt) => {
    evt.stopPropagation();
  });

  return (
    <box
      position="absolute"
      top={0}
      left={0}
      bottom={0}
      right={0}
      alignItems="center"
      justifyContent="center"
      backgroundColor={theme.colors.background}
    >
      {props.children}
    </box>
  );
}
