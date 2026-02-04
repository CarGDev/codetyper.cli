const GRADIENT_COLORS = [
  "#ff55ff",
  "#dd66ff",
  "#bb77ff",
  "#9988ff",
  "#7799ff",
  "#55aaff",
  "#33bbff",
  "#00ccff",
] as const;

export function Logo() {
  return (
    <box flexDirection="column" alignItems="center">
      <ascii_font text="CODETYPER" font="block" color={[...GRADIENT_COLORS]} />
    </box>
  );
}
