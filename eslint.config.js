import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import tseslint from "typescript-eslint";
import { defineConfig, globalIgnores } from "eslint/config";

export default defineConfig([
  globalIgnores([
    "node_modules/**",
    "build/**",
    "dist/**",
    ".react-router/**",
    ".wrangler/**",
    "playwright-report/**",
    "test-results/**",
    "worker-configuration.d.ts",
  ]),
  {
    files: ["**/*.{ts,tsx}"],
    extends: [tseslint.configs.recommended, reactHooks.configs.flat["recommended-latest"]],
    languageOptions: {
      globals: { ...globals.browser, ...globals.serviceworker, ...globals.node },
    },
    rules: {
      "@typescript-eslint/no-empty-object-type": "off",
    },
  },
  {
    files: ["app/**/*.{js,jsx}"],
    extends: [reactHooks.configs.flat["recommended-latest"]],
    languageOptions: {
      globals: globals.browser,
      parserOptions: { ecmaVersion: "latest", sourceType: "module", ecmaFeatures: { jsx: true } },
    },
    rules: {
      // The migrated poster demo intentionally initializes animation and remote
      // player state from effects. Refactor it when the module is redesigned.
      "react-hooks/set-state-in-effect": "off",
    },
  },
]);
