/**
 * Single-line-by-default input editor with Alt+Enter for newlines
 *
 * - Enter: Submit the message immediately
 * - Alt+Enter (Option+Enter on macOS): Insert newline without sending
 * - Paste: Preserves newlines in buffer, does not auto-submit
 */

export type { InputEditorOptions } from "@interfaces/InputEditorOptions";
export type { InputEditorState, InputEditorEvents } from "@/types/input-editor";

export {
  createInputEditorInstance,
  createInputEditor,
  InputEditor,
  type InputEditorInstance,
} from "@ui/input-editor/editor";
