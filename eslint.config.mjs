// @ts-check
import tsParser from "@typescript-eslint/parser";
import tsPlugin from "@typescript-eslint/eslint-plugin";
import importPlugin from "eslint-plugin-import";

/** @type {import("eslint").Linter.Config[]} */
export default [
  // ── Global ignores ─────────────────────────────────────────────────────────
  {
    ignores: [
      "**/node_modules/**",
      "**/dist/**",
      "**/.next/**",
      "**/coverage/**",
      "**/*.js", // ignore compiled JS output
      "prisma/migrations/**",
      "archive/**",
      ".storybook/**",
      "packages/ui/src/*.stories.tsx",
      "storybook-static/**",
      ".tools/**", // Android SDK and other toolchain binaries
    ],
  },

  // ── TypeScript source files ────────────────────────────────────────────────
  {
    files: ["**/*.ts", "**/*.tsx"],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        projectService: {
          maximumDefaultProjectFileMatchCount_THIS_WILL_SLOW_DOWN_LINTING: 32,
          allowDefaultProject: [
            "*.ts",
            "*.config.ts",
            "apps/*/tsup.config.ts",
            "prisma/*.ts",
            "scripts/*.ts",
            "scripts/*.test.ts",
            "tests/web/*.ts",
            "packages/domain/bin/*.ts",
            "packages/domain/src/*.test.ts",
            "packages/domain/src/miniapp/*.test.ts",
            "packages/config/src/*.test.ts",
          ],
        },
        tsconfigRootDir: import.meta.dirname,
      },
    },
    plugins: {
      "@typescript-eslint": tsPlugin,
      import: importPlugin,
    },
    rules: {
      // TypeScript recommended rules
      ...tsPlugin.configs["recommended"].rules,

      // Turn warnings into errors for critical rules
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_" }],
      "@typescript-eslint/no-floating-promises": "error",
      "@typescript-eslint/no-non-null-assertion": "warn",

      // Import hygiene
      "import/no-duplicates": "error",

      // General
      "no-console": ["warn", { allow: ["warn", "error"] }],
      eqeqeq: ["error", "always"],
    },
  },

  // ── Test files — relax some rules ─────────────────────────────────────────
  {
    files: ["**/*.test.ts", "**/*.spec.ts"],
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
      "no-console": "off",
    },
  },

  // ── Scripts — relax some rules ─────────────────────────────────────────────
  {
    files: ["scripts/**/*.mjs"],
    rules: {
      "no-console": "off",
    },
  },
];
