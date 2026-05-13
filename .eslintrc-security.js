const tsParser = require("@typescript-eslint/parser");
const tsPlugin = require("@typescript-eslint/eslint-plugin");
const localRules = require("./eslint-local-rules");

module.exports = [
  {
    files: ["app/api/**/*.ts"],
    languageOptions: {
      parser: tsParser,
      ecmaVersion: "latest",
      sourceType: "module",
    },
    plugins: {
      "@typescript-eslint": tsPlugin,
      "security-local": {
        rules: localRules,
      },
    },
    rules: {
      "security-local/require-auth-check": "warn",
      "security-local/require-org-scope": "warn",
    },
  },
];
