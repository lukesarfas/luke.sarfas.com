// Accessibility scan with axe-core (docs/SPEC.md §7, §10, §12.9).
// WCAG 2.1 A/AA tags (axe's wcag21aa superset covers the 2.2 AA success
// criteria axe can test automatically).
import { test, expect } from "./fixtures.js";
import AxeBuilder from "@axe-core/playwright";

const TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"];

async function scan(page, path) {
  await page.goto(path);
  await expect(page.locator("canvas#maze")).toBeVisible();
  await page.waitForLoadState("networkidle");
  return new AxeBuilder({ page }).withTags(TAGS).analyze();
}

test("showcase has no accessibility violations", async ({ page }) => {
  const results = await scan(page, "/");
  expect(
    results.violations,
    `axe violations on /:\n${JSON.stringify(results.violations, null, 2)}`,
  ).toEqual([]);
});

test("applet has no accessibility violations", async ({ page }) => {
  const results = await scan(page, "/applet/");
  expect(
    results.violations,
    `axe violations on /applet/:\n${JSON.stringify(results.violations, null, 2)}`,
  ).toEqual([]);
});
