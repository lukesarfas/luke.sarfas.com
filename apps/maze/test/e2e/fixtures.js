// Shared test fixtures.
//
// `pageErrors` collects everything that should NEVER happen on a clean launch:
//   - console messages of type "error" (console.error, failed resource loads…)
//   - uncaught exceptions surfaced as the page's "pageerror" event.
// Specs assert this array is empty to enforce the "never crashes on launch,
// zero console errors" guarantee from docs/SPEC.md §10.
import { test as base, expect } from "@playwright/test";

export const test = base.extend({
  pageErrors: async ({ page }, use) => {
    const errors = [];

    page.on("console", (msg) => {
      if (msg.type() === "error") {
        errors.push(`console.error: ${msg.text()}`);
      }
    });

    page.on("pageerror", (err) => {
      errors.push(`pageerror: ${err.message}`);
    });

    await use(errors);
  },
});

export { expect };
