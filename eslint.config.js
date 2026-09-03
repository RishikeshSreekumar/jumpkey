import js from "@eslint/js";
import tseslint from "typescript-eslint";
import globals from "globals";

export default tseslint.config(
  { ignores: ["dist", "node_modules"] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    languageOptions: { globals: { ...globals.browser, chrome: "readonly" } },
  },
  {
    // src/core must stay browser-independent.
    files: ["src/core/**/*.ts"],
    rules: {
      "no-restricted-imports": [
        "error",
        { patterns: ["*chrome*", "webextension-polyfill", "react", "react-dom"] },
      ],
      "no-restricted-globals": ["error", "chrome", "window", "document"],
    },
  },
);
