import { Match, Switch } from "solid-js";
import { useTheme } from "@tui-solid/context/theme";
import { useAppStore } from "@tui-solid/context/app";
import { Logo } from "@tui-solid/components/logo";
import { InputArea } from "@tui-solid/components/input-area";
import { CommandMenu } from "@tui-solid/components/command-menu";
import { ModelSelect } from "@tui-solid/components/model-select";
import { ThemeSelect } from "@tui-solid/components/theme-select";
import { FilePicker } from "@tui-solid/components/file-picker";
import { CenteredModal } from "@tui-solid/components/centered-modal";
import { HOME_VARS } from "@constants/home";

interface HomeProps {
  onSubmit: (input: string) => void;
  onCommand?: (command: string) => void;
  onModelSelect?: (model: string) => void;
  onThemeSelect?: (theme: string) => void;
  onFileSelect?: (file: string) => void;
  files?: string[];
}

export function Home(props: HomeProps) {
  const theme = useTheme();
  const app = useAppStore();

  const handleSubmit = (input: string): void => {
    props.onSubmit(input);
  };

  const handleModelClose = (): void => {
    app.setMode("idle");
  };

  const handleThemeClose = (): void => {
    app.setMode("idle");
  };

  const handleFilePickerClose = (): void => {
    app.setMode("idle");
  };

  return (
    <box
      flexDirection="column"
      flexGrow={1}
      backgroundColor={theme.colors.background}
    >
      <box
        flexGrow={1}
        alignItems="center"
        justifyContent="center"
        flexDirection="column"
      >
        <Logo />

        <box marginTop={2}>
          <text fg={theme.colors.textDim}>{HOME_VARS.subTitle}</text>
        </box>
      </box>

      <box marginTop={2}>
        <InputArea
          onSubmit={handleSubmit}
          placeholder="What would you like to build today?"
        />
      </box>

      <Switch>
        <Match when={app.mode() === "command_menu"}>
          <CenteredModal>
            <CommandMenu
              onSelect={(command) => {
                const lowerCommand = command.toLowerCase();
                // Handle menu-opening commands directly to avoid async timing issues
                if (lowerCommand === "model" || lowerCommand === "models") {
                  app.transitionFromCommandMenu("model_select");
                  return;
                }
                if (lowerCommand === "theme") {
                  app.transitionFromCommandMenu("theme_select");
                  return;
                }
                if (lowerCommand === "agent" || lowerCommand === "a") {
                  app.transitionFromCommandMenu("agent_select");
                  return;
                }
                if (lowerCommand === "mcp") {
                  app.transitionFromCommandMenu("mcp_select");
                  return;
                }
                // For other commands, close menu and process through handler
                app.closeCommandMenu();
                props.onCommand?.(command);
              }}
              onCancel={() => app.closeCommandMenu()}
              isActive={app.mode() === "command_menu"}
            />
          </CenteredModal>
        </Match>

        <Match when={app.mode() === "model_select"}>
          <CenteredModal>
            <ModelSelect
              onSelect={(model) => props.onModelSelect?.(model)}
              onClose={handleModelClose}
              isActive={app.mode() === "model_select"}
            />
          </CenteredModal>
        </Match>

        <Match when={app.mode() === "theme_select"}>
          <CenteredModal>
            <ThemeSelect
              onSelect={(themeName) => props.onThemeSelect?.(themeName)}
              onClose={handleThemeClose}
              isActive={app.mode() === "theme_select"}
            />
          </CenteredModal>
        </Match>

        <Match when={app.mode() === "file_picker"}>
          <CenteredModal>
            <FilePicker
              files={props.files ?? []}
              onSelect={(file) => props.onFileSelect?.(file)}
              onClose={handleFilePickerClose}
              isActive={app.mode() === "file_picker"}
            />
          </CenteredModal>
        </Match>
      </Switch>
    </box>
  );
}
