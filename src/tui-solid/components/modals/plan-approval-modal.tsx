import { createSignal, createMemo, For, Show } from "solid-js";
import { useKeyboard } from "@opentui/solid";
import { TextAttributes } from "@opentui/core";
import { useTheme } from "@tui-solid/context/theme";
import type { ImplementationPlan, PlanStep } from "@/types/plan-mode";

/**
 * Plan approval request for the TUI
 */
export interface PlanApprovalRequest {
  plan: ImplementationPlan;
  resolve?: (response: { approved: boolean; message?: string }) => void;
}

interface PlanApprovalModalProps {
  request: PlanApprovalRequest;
  onRespond?: (approved: boolean, message?: string) => void;
  isActive?: boolean;
}

interface ApprovalOption {
  key: string;
  label: string;
  approved: boolean;
  message?: string;
}

const APPROVAL_OPTIONS: ApprovalOption[] = [
  { key: "y", label: "Approve - proceed with implementation", approved: true },
  { key: "e", label: "Edit - modify plan before execution", approved: false, message: "edit" },
  { key: "n", label: "Reject - cancel this plan", approved: false },
];

export function PlanApprovalModal(props: PlanApprovalModalProps) {
  const theme = useTheme();
  const [selectedIndex, setSelectedIndex] = createSignal(0);
  const [scrollOffset, setScrollOffset] = createSignal(0);
  const isActive = () => props.isActive ?? true;

  const MAX_VISIBLE_STEPS = 5;

  const plan = () => props.request.plan;

  const visibleSteps = createMemo(() => {
    const steps = plan().steps;
    const offset = scrollOffset();
    return steps.slice(offset, offset + MAX_VISIBLE_STEPS);
  });

  const canScrollUp = () => scrollOffset() > 0;
  const canScrollDown = () => scrollOffset() + MAX_VISIBLE_STEPS < plan().steps.length;

  const handleResponse = (approved: boolean, message?: string): void => {
    if (props.request.resolve) {
      props.request.resolve({ approved, message });
    }
    props.onRespond?.(approved, message);
  };

  const getRiskIcon = (risk: PlanStep["riskLevel"]): string => {
    const icons: Record<PlanStep["riskLevel"], string> = {
      high: "\u26A0\uFE0F",
      medium: "\u26A1",
      low: "\u2713",
    };
    return icons[risk];
  };

  const getRiskColor = (risk: PlanStep["riskLevel"]): string => {
    const colors: Record<PlanStep["riskLevel"], string> = {
      high: theme.colors.error,
      medium: theme.colors.warning,
      low: theme.colors.success,
    };
    return colors[risk];
  };

  useKeyboard((evt) => {
    if (!isActive()) return;

    evt.stopPropagation();

    if (evt.name === "up") {
      if (evt.shift) {
        // Scroll plan view
        if (canScrollUp()) {
          setScrollOffset((prev) => prev - 1);
        }
      } else {
        // Navigate options
        setSelectedIndex((prev) =>
          prev > 0 ? prev - 1 : APPROVAL_OPTIONS.length - 1,
        );
      }
      evt.preventDefault();
      return;
    }

    if (evt.name === "down") {
      if (evt.shift) {
        // Scroll plan view
        if (canScrollDown()) {
          setScrollOffset((prev) => prev + 1);
        }
      } else {
        // Navigate options
        setSelectedIndex((prev) =>
          prev < APPROVAL_OPTIONS.length - 1 ? prev + 1 : 0,
        );
      }
      evt.preventDefault();
      return;
    }

    if (evt.name === "return") {
      const option = APPROVAL_OPTIONS[selectedIndex()];
      handleResponse(option.approved, option.message);
      evt.preventDefault();
      return;
    }

    if (evt.name === "escape") {
      handleResponse(false, "cancelled");
      evt.preventDefault();
      return;
    }

    // Handle shortcut keys
    if (evt.name.length === 1 && !evt.ctrl && !evt.meta) {
      const charLower = evt.name.toLowerCase();
      const option = APPROVAL_OPTIONS.find((o) => o.key === charLower);
      if (option) {
        handleResponse(option.approved, option.message);
        evt.preventDefault();
      }
    }
  });

  return (
    <box
      flexDirection="column"
      borderColor={theme.colors.warning}
      border={["top", "bottom", "left", "right"]}
      backgroundColor={theme.colors.background}
      paddingLeft={2}
      paddingRight={2}
      paddingTop={1}
      paddingBottom={1}
      maxHeight={25}
    >
      {/* Header */}
      <box marginBottom={1}>
        <text fg={theme.colors.warning} attributes={TextAttributes.BOLD}>
          Plan Approval Required
        </text>
      </box>

      {/* Title and Summary */}
      <box flexDirection="column" marginBottom={1}>
        <text fg={theme.colors.primary} attributes={TextAttributes.BOLD}>
          {plan().title}
        </text>
        <text fg={theme.colors.textDim}>{plan().summary}</text>
      </box>

      {/* Estimated Changes */}
      <box flexDirection="row" marginBottom={1}>
        <text fg={theme.colors.success}>
          +{plan().estimatedChanges.filesCreated} create{" "}
        </text>
        <text fg={theme.colors.warning}>
          ~{plan().estimatedChanges.filesModified} modify{" "}
        </text>
        <text fg={theme.colors.error}>
          -{plan().estimatedChanges.filesDeleted} delete
        </text>
      </box>

      {/* Steps */}
      <box flexDirection="column" marginBottom={1}>
        <text fg={theme.colors.text} attributes={TextAttributes.BOLD}>
          Implementation Steps ({plan().steps.length} total):
        </text>
        <Show when={canScrollUp()}>
          <text fg={theme.colors.textDim}> {"\u25B2"} more above...</text>
        </Show>
        <For each={visibleSteps()}>
          {(step, index) => (
            <box flexDirection="row">
              <text fg={getRiskColor(step.riskLevel)}>
                {getRiskIcon(step.riskLevel)}{" "}
              </text>
              <text fg={theme.colors.textDim}>
                {scrollOffset() + index() + 1}.{" "}
              </text>
              <text fg={theme.colors.text}>
                {step.title.substring(0, 50)}
                {step.title.length > 50 ? "..." : ""}
              </text>
            </box>
          )}
        </For>
        <Show when={canScrollDown()}>
          <text fg={theme.colors.textDim}> {"\u25BC"} more below...</text>
        </Show>
      </box>

      {/* Risks */}
      <Show when={plan().risks.length > 0}>
        <box flexDirection="column" marginBottom={1}>
          <text fg={theme.colors.error} attributes={TextAttributes.BOLD}>
            Risks ({plan().risks.length}):
          </text>
          <For each={plan().risks.slice(0, 2)}>
            {(risk) => (
              <box flexDirection="row">
                <text fg={theme.colors.error}> - </text>
                <text fg={theme.colors.text}>
                  {risk.description.substring(0, 60)}
                </text>
              </box>
            )}
          </For>
          <Show when={plan().risks.length > 2}>
            <text fg={theme.colors.textDim}>
              {" "}
              ... and {plan().risks.length - 2} more
            </text>
          </Show>
        </box>
      </Show>

      {/* Options */}
      <box flexDirection="column" marginTop={1}>
        <For each={APPROVAL_OPTIONS}>
          {(option, index) => {
            const isSelected = () => index() === selectedIndex();
            const keyColor = () =>
              option.approved ? theme.colors.success : theme.colors.error;
            return (
              <box flexDirection="row">
                <text
                  fg={isSelected() ? theme.colors.primary : undefined}
                  attributes={
                    isSelected() ? TextAttributes.BOLD : TextAttributes.NONE
                  }
                >
                  {isSelected() ? "> " : "  "}
                </text>
                <text fg={keyColor()}>[{option.key}] </text>
                <text fg={isSelected() ? theme.colors.primary : undefined}>
                  {option.label}
                </text>
              </box>
            );
          }}
        </For>
      </box>

      {/* Footer */}
      <box marginTop={1}>
        <text fg={theme.colors.textDim}>
          {"\u2191\u2193"} options | Shift+{"\u2191\u2193"} scroll steps | Enter select | y/e/n shortcut
        </text>
      </box>
    </box>
  );
}
