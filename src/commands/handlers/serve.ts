/**
 * Serve command handler
 */

import { boxMessage, warningMessage, infoMessage } from "@utils/core/terminal";
import type { CommandOptions } from "@/types/common";
import { SERVER_INFO } from "@constants/serve";

export const handleServe = async (_options: CommandOptions): Promise<void> => {
  boxMessage(SERVER_INFO, "Server Mode");
  warningMessage("Server mode not yet implemented");
  infoMessage(
    "This will integrate with the existing agent/main.py JSON-RPC server",
  );
};
