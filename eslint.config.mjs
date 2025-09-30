// Flat ESLint config for ESLint v9 + TypeScript + Prettier
import js from "@eslint/js";
import tseslint from "typescript-eslint";
import prettier from "eslint-config-prettier";

export default [
  {
    ignores: ["node_modules/**", "dist/**", ".tap/**", ".vscode/**", "coverage/**"],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    languageOptions: {
      parserOptions: {
        project: ["./tsconfig.json"],
        sourceType: "module",
        ecmaVersion: 2022,
      },
    },
    settings: {
      "import/resolver": {
        typescript: {
          project: "./tsconfig.json",
        },
      },
    },
    rules: {
      "@typescript-eslint/explicit-function-return-type": "off",
      "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_" }],
      indent: ["error", 2, { SwitchCase: 1 }],
      semi: ["error", "always"],
      quotes: ["error", "double"],
      "linebreak-style": "off",
    },
  },
  prettier,
];
