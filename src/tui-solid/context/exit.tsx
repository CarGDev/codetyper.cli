import { createSignal, onCleanup } from "solid-js";
import { useRenderer } from "@opentui/solid";
import { createSimpleContext } from "./helper";
import { setGlobalExitMessage } from "@utils/core/terminal";

interface ExitContextInput extends Record<string, unknown> {
  onExit?: () => void | Promise<void>;
}

interface ExitContextValue {
  exit: (code?: number) => Promise<void>;
  requestExit: () => void;
  getExitCode: () => number;
  isExiting: () => boolean;
  exitRequested: () => boolean;
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
      
      // Exit message will be written by emergencyTerminalCleanup
      // which is registered on process "exit" event in terminal.ts
      
      // Exit the process
      process.exit(code);
    };

    const setExitMessage = (message: string | undefined): void => {
      setGlobalExitMessage(message);
    };

    const getExitMessage = (): string | undefined => {
      return undefined; // Message is stored in terminal.ts
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
      getExitCode: exitCode,
      isExiting,
      exitRequested,
      requestExit,
      cancelExit,
      confirmExit,
      setExitMessage,
      getExitMessage,
    };
  },
});
