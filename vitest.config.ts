import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    globals: true,
    include: [
      "packages/domain/src/**/*.test.ts",
      "packages/config/src/**/*.test.ts",
      "apps/api/src/**/*.test.ts",
      "apps/api/test/**/*.test.ts",
      "apps/adapters/**/*.test.ts",
      "apps/web/lib/**/*.test.ts",
      "apps/mobile/src/**/*.test.ts",
      "scripts/**/*.test.ts",
    ],
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
    },
  },
});
