import { createSignal, onCleanup } from "solid-js";
import { useRenderer } from "@opentui/solid";
import { createSimpleContext } from "./helper";
import { generateSessionSummary } from "@utils/core/session-stats";
import { appStore } from "./app";

interface ExitContextInput extends Record<string, unknown> {
  sessionId?: string;
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
    const renderer = useRenderer();
    const [exitCode, setExitCode] = createSignal(0);
    const [isExiting, setIsExiting] = createSignal(false);
    const [exitRequested, setExitRequested] = createSignal(false);

    const exit = (code = 0): void => {
      setExitCode(code);
      setIsExiting(true);
      
      // Generate and store exit message before destroying renderer
      const state = appStore.getState();
      const summary = generateSessionSummary({
        sessionId: props.sessionId ?? "unknown",
        sessionStats: state.sessionStats,
        modifiedFiles: state.modifiedFiles,
        modelName: state.model,
        providerName: state.provider,
      });
      
      // Destroy renderer first to stop rendering
      renderer.destroy();
      
      // Call the onExit callback
      props.onExit?.();
      
      // Write the summary after renderer is destroyed
      process.stdout.write(summary + "\n");
      
      // Exit the process
      process.exit(code);
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
