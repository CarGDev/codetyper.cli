/**
 * Bouncing Loader Component
 *
 * A horizontal bouncing loader with gradient colors.
 * The active dot bounces back and forth with a colorful trail.
 */

import React, { useEffect, useState } from "react";
import { Text } from "ink";

const LOADER_COLORS = [
  "#ff00ff", // magenta
  "#ff33ff", // light magenta
  "#cc66ff", // purple
  "#9966ff", // violet
  "#6699ff", // blue-violet
  "#33ccff", // cyan
  "#00ffff", // cyan bright
  "#33ffcc", // teal
] as const;

const LOADER_CONFIG = {
  dotCount: 8,
  frameInterval: 100,
  dotChar: "●",
  emptyChar: "○",
} as const;

export function BouncingLoader(): React.ReactElement {
  const [position, setPosition] = useState(0);
  const [direction, setDirection] = useState(1);

  useEffect(() => {
    const timer = setInterval(() => {
      setPosition((prev) => {
        const next = prev + direction;

        if (next >= LOADER_CONFIG.dotCount - 1) {
          setDirection(-1);
          return LOADER_CONFIG.dotCount - 1;
        }

        if (next <= 0) {
          setDirection(1);
          return 0;
        }

        return next;
      });
    }, LOADER_CONFIG.frameInterval);

    return () => clearInterval(timer);
  }, [direction]);

  const dots = Array.from({ length: LOADER_CONFIG.dotCount }, (_, i) => {
    const distance = Math.abs(i - position);
    const isActive = distance === 0;
    const isTrail = distance <= 2;

    // Get color based on position in the gradient
    const colorIndex = i % LOADER_COLORS.length;
    const color = LOADER_COLORS[colorIndex];

    return {
      char:
        isActive || isTrail ? LOADER_CONFIG.dotChar : LOADER_CONFIG.emptyChar,
      color,
      dimColor: !isActive && !isTrail,
    };
  });

  return (
    <Text>
      {dots.map((dot, i) => (
        <Text key={i} color={dot.color} dimColor={dot.dimColor}>
          {dot.char}
        </Text>
      ))}
    </Text>
  );
}
