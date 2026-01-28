import { createSignal, onCleanup } from "solid-js";
import { createSimpleContext } from "./helper";

interface ExitContextInput extends Record<string, unknown> {
  onExit?: () => void;
}

interface ExitContextValue {
  exit: (code?: number) => void;
  exitCode: () => number;
  isExiting: () => boolean;
  requestExit: () => void;
  cancelExit: () => void;
  confirmExit: () => void;
}

export const { provider: ExitProvider, use: useExit } = createSimpleContext<
  ExitContextValue,
  ExitContextInput
>({
  name: "Exit",
  init: (props) => {
    const [exitCode, setExitCode] = createSignal(0);
    const [isExiting, setIsExiting] = createSignal(false);
    const [exitRequested, setExitRequested] = createSignal(false);

    const exit = (code = 0): void => {
      setExitCode(code);
      setIsExiting(true);
      props.onExit?.();
    };

    const requestExit = (): void => {
      setExitRequested(true);
    };

    const cancelExit = (): void => {
      setExitRequested(false);
    };

    const confirmExit = (): void => {
      if (exitRequested()) {
        exit(0);
      }
    };

    onCleanup(() => {
      setIsExiting(false);
      setExitRequested(false);
    });

    return {
      exit,
      exitCode,
      isExiting,
      requestExit,
      cancelExit,
      confirmExit,
    };
  },
});
