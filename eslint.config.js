import js from "@eslint/js";
import globals from "globals";
import node from "eslint-plugin-node";

export default [
  {
    files: ["**/*.js"],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "module",
      globals: globals.node,
    },
    plugins: { node },
    rules: {
      ...js.configs.recommended.rules,
      ...node.configs.recommended.rules,
      "no-console": "off",
      "no-unused-vars": ["error", { argsIgnorePattern: "^_" }],
    },
  },
];
