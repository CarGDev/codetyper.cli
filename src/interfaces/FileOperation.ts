/**
 * File Operation Interface
 */

export interface FileOperation {
  type: "read" | "write" | "edit" | "delete" | "create";
  path: string;
  content?: string;
  description?: string;
}
