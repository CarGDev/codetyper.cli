/**
 * Permission Modal Component - Y/N prompts for tool execution
 */

import React from "react";
import { Box, Text } from "ink";
import { useAppStore } from "@tui/store";
import { SelectMenu } from "@tui/components/SelectMenu";
import type {
  SelectOption,
  PermissionType,
  PermissionScope,
} from "@/types/tui";
import {
  PERMISSION_OPTIONS,
  PERMISSION_TYPE_LABELS,
} from "@constants/tui-components";

export function PermissionModal(): React.ReactElement | null {
  const permissionRequest = useAppStore((state) => state.permissionRequest);
  const setPermissionRequest = useAppStore(
    (state) => state.setPermissionRequest,
  );

  if (!permissionRequest) return null;

  const handleSelect = (option: SelectOption): void => {
    permissionRequest.resolve({
      allowed: option.value !== "deny",
      scope:
        option.value === "deny" ? undefined : (option.value as PermissionScope),
    });
    setPermissionRequest(null);
  };

  const typeLabel =
    PERMISSION_TYPE_LABELS[permissionRequest.type as PermissionType] ??
    "Unknown operation";

  return (
    <Box
      flexDirection="column"
      borderStyle="double"
      borderColor="yellow"
      paddingX={2}
      paddingY={1}
      marginY={1}
    >
      <Box marginBottom={1}>
        <Text color="yellow" bold>
          ⚠ Permission Required
        </Text>
      </Box>

      <Box marginBottom={1}>
        <Text>{typeLabel}: </Text>
        <Text color="cyan" bold>
          {permissionRequest.command ||
            permissionRequest.path ||
            permissionRequest.description}
        </Text>
      </Box>

      {permissionRequest.description &&
        permissionRequest.description !== permissionRequest.command && (
          <Box marginBottom={1}>
            <Text dimColor>{permissionRequest.description}</Text>
          </Box>
        )}

      <SelectMenu
        options={PERMISSION_OPTIONS}
        onSelect={handleSelect}
        isActive={!!permissionRequest}
      />
    </Box>
  );
}
