import { createSignal, onCleanup, onMount, For } from "solid-js";
import { TextAttributes } from "@opentui/core";

const LOADER_COLORS = [
  "#ff00ff",
  "#ff33ff",
  "#cc66ff",
  "#9966ff",
  "#6699ff",
  "#33ccff",
  "#00ffff",
  "#33ffcc",
] as const;

const LOADER_CONFIG = {
  dotCount: 8,
  frameInterval: 100,
  dotChar: "●",
  emptyChar: "○",
} as const;

interface DotInfo {
  char: string;
  color: string;
  dim: boolean;
}

export function BouncingLoader() {
  const [position, setPosition] = createSignal(0);
  const [direction, setDirection] = createSignal(1);

  let intervalId: ReturnType<typeof setInterval> | null = null;

  onMount(() => {
    intervalId = setInterval(() => {
      const dir = direction();
      const prev = position();
      const next = prev + dir;

      if (next >= LOADER_CONFIG.dotCount - 1) {
        setDirection(-1);
        setPosition(LOADER_CONFIG.dotCount - 1);
        return;
      }

      if (next <= 0) {
        setDirection(1);
        setPosition(0);
        return;
      }

      setPosition(next);
    }, LOADER_CONFIG.frameInterval);
  });

  onCleanup(() => {
    if (intervalId) {
      clearInterval(intervalId);
    }
  });

  const dots = (): DotInfo[] => {
    const pos = position();
    return Array.from({ length: LOADER_CONFIG.dotCount }, (_, i) => {
      const distance = Math.abs(i - pos);
      const isActive = distance === 0;
      const isTrail = distance <= 2;
      const colorIndex = i % LOADER_COLORS.length;
      const color = LOADER_COLORS[colorIndex];

      return {
        char:
          isActive || isTrail ? LOADER_CONFIG.dotChar : LOADER_CONFIG.emptyChar,
        color,
        dim: !isActive && !isTrail,
      };
    });
  };

  return (
    <box flexDirection="row">
      <For each={dots()}>
        {(dot) => (
          <text
            fg={dot.color}
            attributes={dot.dim ? TextAttributes.DIM : TextAttributes.NONE}
          >
            {dot.char}
          </text>
        )}
      </For>
    </box>
  );
}
