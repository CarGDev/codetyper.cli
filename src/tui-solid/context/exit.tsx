import { createSignal, onCleanup } from "solid-js";
import { useRenderer } from "@opentui/solid";
import { createSimpleContext } from "./helper";

interface ExitContextInput extends Record<string, unknown> {
  onExit?: () => void | Promise<void>;
}

interface ExitContextValue {
  exit: (code?: number) => void;
  exitCode: () => number;
  isExiting: () => boolean;
  requestExit: () => void;
  cancelExit: () => void;
  confirmExit: () => void;
  setExitMessage: (message: string | undefined) => void;
  getExitMessage: () => string | undefined;
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
    const [exitMessage, setExitMessageState] = createSignal<string | undefined>(undefined);

    const exit = async (code = 0): Promise<void> => {
      setExitCode(code);
      setIsExiting(true);
      
      // Reset window title before destroying renderer
      try {
        renderer.setTerminalTitle("");
      } catch {
        // Ignore
      }
      
      // Destroy renderer to stop rendering and exit alternate screen
      renderer.destroy();
      
      // Call the onExit callback (may be async)
      await props.onExit?.();
      
      // Write the stored exit message after renderer is destroyed
      const message = exitMessage();
      if (message) {
        process.stdout.write(message + "\n");
      }
      
      // Exit the process
      process.exit(code);
    };

    const setExitMessage = (message: string | undefined): void => {
      setExitMessageState(message);
    };

    const getExitMessage = (): string | undefined => {
      return exitMessage();
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
      setExitMessageState(undefined);
    });

    return {
      exit,
      exitCode,
      isExiting,
      requestExit,
      cancelExit,
      confirmExit,
      setExitMessage,
      getExitMessage,
    };
  },
});
