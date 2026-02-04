/**
 * Terminal spinner animations
 */

export { Spinners } from "@constants/spinner";
export type { SpinnerType } from "@/types/spinner";
export type { SpinnerOptions } from "@interfaces/SpinnerOptions";

export {
  createSpinnerInstance,
  createSpinner,
  Spinner,
  type SpinnerInstance,
} from "@ui/spinner/core/spinner";

export {
  createScannerInstance,
  ScannerSpinner,
  type ScannerInstance,
} from "@ui/spinner/scanner";

export { progressBar } from "@ui/spinner/progress";
