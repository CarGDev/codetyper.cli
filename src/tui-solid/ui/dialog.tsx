import { Show, type ParentProps } from "solid-js";
import { useTheme } from "@tui-solid/context/theme";
import { useTerminalDimensions, useKeyboard } from "@opentui/solid";
import { RGBA, TextAttributes } from "@opentui/core";

export type DialogSize = "small" | "medium" | "large";

interface DialogProps {
  size?: DialogSize;
  title?: string;
  onClose?: () => void;
}

const SIZE_WIDTHS: Record<DialogSize, number> = {
  small: 40,
  medium: 60,
  large: 80,
};

export function Dialog(props: ParentProps<DialogProps>) {
  const theme = useTheme();
  const dimensions = useTerminalDimensions();
  const size = () => props.size ?? "medium";

  useKeyboard((evt) => {
    if (evt.name === "escape" && props.onClose) {
      props.onClose();
      evt.preventDefault();
      evt.stopPropagation();
    }
  });

  return (
    <box
      onMouseUp={() => props.onClose?.()}
      width={dimensions().width}
      height={dimensions().height}
      alignItems="center"
      position="absolute"
      paddingTop={Math.floor(dimensions().height / 4)}
      left={0}
      top={0}
      backgroundColor={RGBA.fromInts(0, 0, 0, 150)}
    >
      <box
        onMouseUp={(e) => e.stopPropagation()}
        width={SIZE_WIDTHS[size()]}
        maxWidth={dimensions().width - 2}
        backgroundColor={theme.colors.backgroundPanel ?? "#1e1e1e"}
        borderColor={theme.colors.borderModal}
        border={["top", "bottom", "left", "right"]}
        paddingTop={1}
        paddingBottom={1}
        paddingLeft={2}
        paddingRight={2}
        flexDirection="column"
      >
        <Show when={props.title}>
          <text
            attributes={TextAttributes.BOLD}
            fg={theme.colors.text}
            marginBottom={1}
          >
            {props.title}
          </text>
        </Show>
        {props.children}
      </box>
    </box>
  );
}

interface DialogActionsProps {
  onConfirm?: () => void;
  onCancel?: () => void;
  confirmLabel?: string;
  cancelLabel?: string;
  confirmColor?: string;
  showCancel?: boolean;
}

export function DialogActions(props: DialogActionsProps) {
  const theme = useTheme();
  const showCancel = () => props.showCancel ?? true;

  return (
    <box flexDirection="row" justifyContent="flex-end" gap={2} marginTop={2}>
      <Show when={showCancel()}>
        <box
          paddingLeft={2}
          paddingRight={2}
          borderColor={theme.colors.border}
          border={["top", "bottom", "left", "right"]}
          onMouseUp={() => props.onCancel?.()}
        >
          <text fg={theme.colors.textDim}>{props.cancelLabel ?? "Cancel"}</text>
        </box>
      </Show>
      <box
        paddingLeft={2}
        paddingRight={2}
        backgroundColor={props.confirmColor ?? theme.colors.primary}
        onMouseUp={() => props.onConfirm?.()}
      >
        <text fg={theme.colors.text}>{props.confirmLabel ?? "Confirm"}</text>
      </box>
    </box>
  );
}

interface ConfirmDialogProps {
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "default" | "danger";
}

export function ConfirmDialog(props: ConfirmDialogProps) {
  const theme = useTheme();
  const confirmColor = () =>
    props.variant === "danger" ? theme.colors.error : theme.colors.primary;

  return (
    <Dialog title={props.title} onClose={props.onCancel}>
      <text fg={theme.colors.text} wrapMode="word">
        {props.message}
      </text>
      <DialogActions
        onConfirm={props.onConfirm}
        onCancel={props.onCancel}
        confirmLabel={props.confirmLabel}
        cancelLabel={props.cancelLabel}
        confirmColor={confirmColor()}
      />
    </Dialog>
  );
}

interface AlertDialogProps {
  title: string;
  message: string;
  onClose: () => void;
  closeLabel?: string;
}

export function AlertDialog(props: AlertDialogProps) {
  const theme = useTheme();

  return (
    <Dialog title={props.title} onClose={props.onClose}>
      <text fg={theme.colors.text} wrapMode="word">
        {props.message}
      </text>
      <DialogActions
        onConfirm={props.onClose}
        confirmLabel={props.closeLabel ?? "OK"}
        showCancel={false}
      />
    </Dialog>
  );
}
