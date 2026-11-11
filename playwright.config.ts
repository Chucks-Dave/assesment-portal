import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  use: {
    ...devices["Desktop Chrome"],
    channel: "chrome",
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000",
    trace: "retain-on-failure",
  },
});
