/**
 * Chat TUI permission handling
 */

import { v4 as uuidv4 } from "uuid";

import { setPermissionHandler } from "@services/core/permissions";
import type {
  PermissionPromptRequest,
  PermissionPromptResponse,
} from "@/types/permissions";
import { appStore } from "@tui-solid/context/app";

export const createPermissionHandler = (): ((
  request: PermissionPromptRequest,
) => Promise<PermissionPromptResponse>) => {
  return (
    request: PermissionPromptRequest,
  ): Promise<PermissionPromptResponse> => {
    return new Promise((resolve) => {
      appStore.setMode("permission_prompt");

      appStore.setPermissionRequest({
        id: uuidv4(),
        type: request.type,
        description: request.description,
        command: request.command,
        path: request.path,
        resolve: (response) => {
          appStore.setPermissionRequest(null);
          appStore.setMode("tool_execution");
          resolve(response);
        },
      });
    });
  };
};

export const setupPermissionHandler = (): void => {
  setPermissionHandler(createPermissionHandler());
};

export const cleanupPermissionHandler = (): void => {
  setPermissionHandler(null);
};
