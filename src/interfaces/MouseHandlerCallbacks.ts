/**
 * Mouse Handler Callbacks Interface
 *
 * Callbacks for handling mouse scroll events
 */

export interface MouseHandlerCallbacks {
  /** Called when scroll wheel moves up */
  onScrollUp: (lines: number) => void;
  /** Called when scroll wheel moves down */
  onScrollDown: (lines: number) => void;
}
