/**
 * Plan Approval Constants
 *
 * Options and configuration for the plan approval prompt,
 * modeled after Claude Code's plan approval flow.
 */

/** How edits should be handled after plan approval */
export type PlanEditMode =
  | "auto_accept_clear"   // Clear context and auto-accept edits
  | "auto_accept"         // Auto-accept edits
  | "manual_approve"      // Manually approve each edit
  | "feedback";           // User provides feedback/changes

/** A selectable option in the plan approval modal */
export interface PlanApprovalOption {
  key: string;
  label: string;
  description: string;
  editMode: PlanEditMode;
  shortcut?: string;
}

/** Available plan approval options, matching Claude Code's pattern */
export const PLAN_APPROVAL_OPTIONS: PlanApprovalOption[] = [
  {
    key: "1",
    label: "Yes, clear context and auto-accept edits",
    description: "Approve plan, clear conversation context, and auto-accept all file edits",
    editMode: "auto_accept_clear",
    shortcut: "shift+tab",
  },
  {
    key: "2",
    label: "Yes, auto-accept edits",
    description: "Approve plan and auto-accept all file edits without prompting",
    editMode: "auto_accept",
  },
  {
    key: "3",
    label: "Yes, manually approve edits",
    description: "Approve plan but require manual approval for each file edit",
    editMode: "manual_approve",
  },
  {
    key: "4",
    label: "Type here to tell CodeTyper what to change",
    description: "Provide feedback or modifications to the plan",
    editMode: "feedback",
  },
];

/** Maximum visible options before scrolling */
export const PLAN_APPROVAL_MAX_VISIBLE_OPTIONS = 4;

/** Footer help text for plan approval modal */
export const PLAN_APPROVAL_FOOTER_TEXT =
  "ctrl-g to edit in editor";
