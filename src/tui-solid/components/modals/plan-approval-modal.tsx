import { createSignal, createMemo, For, Show } from "solid-js";
import { useKeyboard } from "@opentui/solid";
import { TextAttributes } from "@opentui/core";
import { useTheme } from "@tui-solid/context/theme";
import type { PlanApprovalPrompt, PlanApprovalPromptResponse } from "@/types/tui";
import {
  PLAN_APPROVAL_OPTIONS,
  PLAN_APPROVAL_FOOTER_TEXT,
} from "@constants/plan-approval";
import type { PlanApprovalOption, PlanEditMode } from "@constants/plan-approval";

interface PlanApprovalModalProps {
  prompt: PlanApprovalPrompt;
  onRespond: (response: PlanApprovalPromptResponse) => void;
  isActive?: boolean;
}

export function PlanApprovalModal(props: PlanApprovalModalProps) {
  const theme = useTheme();
  const [selectedIndex, setSelectedIndex] = createSignal(0);
  const [feedbackMode, setFeedbackMode] = createSignal(false);
  const [feedbackText, setFeedbackText] = createSignal("");
  const isActive = () => props.isActive ?? true;

  const optionCount = PLAN_APPROVAL_OPTIONS.length;

  const handleApproval = (option: PlanApprovalOption): void => {
    if (option.editMode === "feedback") {
      setFeedbackMode(true);
      return;
    }

    props.onRespond({
      approved: true,
      editMode: option.editMode,
    });
  };

  const handleFeedbackSubmit = (): void => {
    const text = feedbackText().trim();
    if (!text) return;

    props.onRespond({
      approved: true,
      editMode: "feedback",
      feedback: text,
    });
  };

  const handleCancel = (): void => {
    if (feedbackMode()) {
      setFeedbackMode(false);
      setFeedbackText("");
      return;
    }

    props.onRespond({
      approved: false,
      editMode: "manual_approve",
    });
  };

  useKeyboard((evt) => {
    if (!isActive()) return;

    evt.stopPropagation();

    // Feedback mode: handle text input
    if (feedbackMode()) {
      if (evt.name === "return") {
        handleFeedbackSubmit();
        evt.preventDefault();
        return;
      }
      if (evt.name === "escape") {
        handleCancel();
        evt.preventDefault();
        return;
      }
      if (evt.name === "backspace") {
        setFeedbackText((prev) => prev.slice(0, -1));
        evt.preventDefault();
        return;
      }
      if (evt.name.length === 1 && !evt.ctrl && !evt.meta) {
        setFeedbackText((prev) => prev + evt.name);
        evt.preventDefault();
      }
      return;
    }

    // Normal mode: navigate options
    if (evt.name === "up") {
      setSelectedIndex((prev) =>
        prev > 0 ? prev - 1 : optionCount - 1,
      );
      evt.preventDefault();
      return;
    }

    if (evt.name === "down") {
      setSelectedIndex((prev) =>
        prev < optionCount - 1 ? prev + 1 : 0,
      );
      evt.preventDefault();
      return;
    }

    if (evt.name === "return") {
      handleApproval(PLAN_APPROVAL_OPTIONS[selectedIndex()]);
      evt.preventDefault();
      return;
    }

    if (evt.name === "escape") {
      handleCancel();
      evt.preventDefault();
      return;
    }

    // Shift+Tab shortcut for option 1 (auto-accept clear)
    if (evt.name === "tab" && evt.shift) {
      handleApproval(PLAN_APPROVAL_OPTIONS[0]);
      evt.preventDefault();
      return;
    }

    // Number key shortcuts (1-4)
    if (evt.name.length === 1 && !evt.ctrl && !evt.meta) {
      const option = PLAN_APPROVAL_OPTIONS.find((o) => o.key === evt.name);
      if (option) {
        handleApproval(option);
        evt.preventDefault();
      }
    }
  });

  return (
    <box
      flexDirection="column"
      borderColor={theme.colors.borderModal}
      border={["top", "bottom", "left", "right"]}
      backgroundColor={theme.colors.background}
      paddingLeft={2}
      paddingRight={2}
      paddingTop={1}
      paddingBottom={1}
    >
      {/* Header */}
      <box marginBottom={1}>
        <text fg={theme.colors.primary} attributes={TextAttributes.BOLD}>
          CodeTyper has written up a plan and is ready to execute. Would you
          like to proceed?
        </text>
      </box>

      {/* Plan info */}
      <Show when={props.prompt.planTitle}>
        <box marginBottom={1}>
          <text fg={theme.colors.text} attributes={TextAttributes.BOLD}>
            {props.prompt.planTitle}
          </text>
        </box>
      </Show>

      <Show when={props.prompt.planSummary}>
        <box marginBottom={1}>
          <text fg={theme.colors.textDim}>{props.prompt.planSummary}</text>
        </box>
      </Show>

      {/* Options */}
      <Show when={!feedbackMode()}>
        <box flexDirection="column" marginTop={1}>
          <For each={PLAN_APPROVAL_OPTIONS}>
            {(option, index) => {
              const isSelected = () => index() === selectedIndex();
              return (
                <box flexDirection="row">
                  <text
                    fg={isSelected() ? theme.colors.primary : theme.colors.textDim}
                    attributes={
                      isSelected() ? TextAttributes.BOLD : TextAttributes.NONE
                    }
                  >
                    {isSelected() ? "> " : "  "}
                  </text>
                  <text fg={theme.colors.textDim}>{option.key}. </text>
                  <text
                    fg={isSelected() ? theme.colors.text : theme.colors.textDim}
                  >
                    {option.label}
                  </text>
                  <Show when={option.shortcut}>
                    <text fg={theme.colors.textMuted}>
                      {" "}({option.shortcut})
                    </text>
                  </Show>
                </box>
              );
            }}
          </For>
        </box>
      </Show>

      {/* Feedback input mode */}
      <Show when={feedbackMode()}>
        <box flexDirection="column" marginTop={1}>
          <text fg={theme.colors.text}>
            Tell CodeTyper what to change:
          </text>
          <box
            border={["left"]}
            borderColor={theme.colors.borderFocus}
            paddingLeft={1}
            marginTop={1}
          >
            <text fg={theme.colors.text}>
              {feedbackText() || " "}
              <text fg={theme.colors.bgCursor}>_</text>
            </text>
          </box>
          <text fg={theme.colors.textDim}>
            Enter to submit | Esc to cancel
          </text>
        </box>
      </Show>

      {/* Footer */}
      <Show when={!feedbackMode()}>
        <box marginTop={1} flexDirection="row">
          <Show when={props.prompt.planFilePath}>
            <text fg={theme.colors.textDim}>
              {PLAN_APPROVAL_FOOTER_TEXT} - {props.prompt.planFilePath}
            </text>
          </Show>
          <Show when={!props.prompt.planFilePath}>
            <text fg={theme.colors.textDim}>
              {"\u2191\u2193"} options | Enter select | 1-4 shortcut | Esc
              cancel
            </text>
          </Show>
        </box>
      </Show>
    </box>
  );
}
