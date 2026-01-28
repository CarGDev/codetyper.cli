import { createSignal, onCleanup, onMount } from "solid-js";
import { useTheme } from "@tui-solid/context/theme";

const SPINNER_FRAMES = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];
const SPINNER_INTERVAL = 80;

interface SpinnerProps {
  label?: string;
}

export function Spinner(props: SpinnerProps) {
  const theme = useTheme();
  const [frame, setFrame] = createSignal(0);

  let intervalId: ReturnType<typeof setInterval> | null = null;

  onMount(() => {
    intervalId = setInterval(() => {
      setFrame((f) => (f + 1) % SPINNER_FRAMES.length);
    }, SPINNER_INTERVAL);
  });

  onCleanup(() => {
    if (intervalId) {
      clearInterval(intervalId);
    }
  });

  return (
    <box flexDirection="row" gap={1}>
      <text fg={theme.colors.primary}>{SPINNER_FRAMES[frame()]}</text>
      {props.label && <text fg={theme.colors.textDim}>{props.label}</text>}
    </box>
  );
}
