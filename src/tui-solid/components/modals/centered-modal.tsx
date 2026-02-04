import { JSXElement } from "solid-js";
import { useTheme } from "@tui-solid/context/theme";

interface CenteredModalProps {
  children: JSXElement;
}

/**
 * A container that centers its children in the terminal window.
 * Uses absolute positioning with flexbox centering.
 */
export function CenteredModal(props: CenteredModalProps) {
  const theme = useTheme();

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
