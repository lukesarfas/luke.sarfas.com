// Playwright config for the deployed A* maze showcase (apps/maze).
//
// The webServer builds the maze app and serves the static `dist/` via
// `astro preview` on port 4324, then the specs exercise it as a browser would
// hit the deployed site. We never touch the rest of the monorepo here.
import { fileURLToPath } from "node:url";
import { dirname } from "node:path";
import { defineConfig, devices } from "@playwright/test";

const __dirname = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  testDir: "./test/e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: "list",

  use: {
    baseURL: "http://localhost:4324",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },

  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],

  webServer: {
    command: "npm run build && npm run preview",
    cwd: __dirname,
    url: "http://localhost:4324",
    timeout: 120000,
    reuseExistingServer: !process.env.CI,
  },
});
