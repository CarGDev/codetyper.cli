interface PermissionResponse {
  allowed: boolean;
}

export const onPermissionRequest = async (): Promise<PermissionResponse> => {
  return { allowed: false };
};
