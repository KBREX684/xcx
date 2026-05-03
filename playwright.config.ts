import { defineConfig } from "@playwright/test";

process.env.ACP_ED25519_PRIVATE_KEY_HEX ??= "1".repeat(64);
process.env.ACP_KEY_VERSION ??= "e2e-v1";
process.env.ACP_ALLOW_PRIVATE_WEBHOOKS ??= "1";
process.env.DATABASE_PROVIDER ??= "postgresql";
process.env.DATABASE_URL ??= "postgresql://postgres:postgres@localhost:5432/acp_test?schema=public";

const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000";

export default defineConfig({
  testDir: "./tests/web",
  workers: 1,
  timeout: 120_000,
  expect: {
    timeout: 20_000,
  },
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  webServer: {
    command: "npm run db:reset:postgres && npm run dev",
    url: baseURL,
    reuseExistingServer: process.env.PLAYWRIGHT_REUSE_SERVER === "1",
    timeout: 240_000,
  },
});
