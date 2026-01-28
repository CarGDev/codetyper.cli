import globals from "globals";
import tseslint from "typescript-eslint";
import pluginJs from "@eslint/js";

export default tseslint.config(
  pluginJs.configs.recommended,
  ...tseslint.configs.recommended,
  {
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
      },
    },
  },
);