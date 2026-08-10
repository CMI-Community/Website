import { defineConfig, devices } from "@playwright/test";

const externalBaseURL = process.env.PLAYWRIGHT_BASE_URL;

export default defineConfig({
  testDir: "./tests/e2e",
  testMatch: externalBaseURL ? "staging.spec.ts" : "foundation.spec.ts",
  fullyParallel: true,
  workers: externalBaseURL ? 3 : undefined,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : "line",
  use: {
    baseURL: externalBaseURL ?? "http://127.0.0.1:5173",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    { name: "desktop-chromium", use: { ...devices["Desktop Chrome"] } },
    {
      name: "mobile-390",
      use: {
        browserName: "chromium",
        viewport: { width: 390, height: 844 },
        deviceScaleFactor: 2,
        isMobile: true,
        hasTouch: true,
      },
    },
  ],
  webServer: externalBaseURL
    ? undefined
    : {
        command: "npm run db:migrate:local && npm run dev -- --host 127.0.0.1",
        url: "http://127.0.0.1:5173/api/v1/health",
        timeout: 120_000,
        reuseExistingServer: !process.env.CI,
      },
});
