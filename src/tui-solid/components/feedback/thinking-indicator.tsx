import { createSignal, onCleanup, onMount } from "solid-js";
import { useTheme } from "@tui-solid/context/theme";
import {
  THINKING_SPINNER_FRAMES,
  THINKING_SPINNER_INTERVAL,
} from "@constants/tui-components";

interface ThinkingIndicatorProps {
  message: string;
}

export function ThinkingIndicator(props: ThinkingIndicatorProps) {
  const theme = useTheme();
  const [frame, setFrame] = createSignal(0);

  let intervalId: ReturnType<typeof setInterval> | null = null;

  onMount(() => {
    intervalId = setInterval(() => {
      setFrame((prev) => (prev + 1) % THINKING_SPINNER_FRAMES.length);
    }, THINKING_SPINNER_INTERVAL);
  });

  onCleanup(() => {
    if (intervalId) {
      clearInterval(intervalId);
    }
  });

  return (
    <box flexDirection="row">
      <text fg={theme.colors.modeThinking}>
        {THINKING_SPINNER_FRAMES[frame()]}{" "}
      </text>
      <text fg={theme.colors.modeThinking}>{props.message}</text>
    </box>
  );
}
