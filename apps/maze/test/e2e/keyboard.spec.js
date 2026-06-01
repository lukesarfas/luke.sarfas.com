// Keyboard operability (docs/SPEC.md §7): every control reachable from the
// keyboard. Space toggles play/pause; "n" generates a fresh maze.
//
// The solve plays back fast, so before exercising Space we slow it right down
// (speed = min) and regenerate, keeping the search in its EXPLORING phase long
// enough for the toggle to be observable. Assertions poll to stay timing-safe.
import { test, expect } from "./fixtures.js";

async function status(page) {
  return ((await page.locator("#stat-status").textContent()) ?? "").trim();
}

test("Space toggles play/pause; 'n' starts a new maze", async ({ page, pageErrors }) => {
  await page.goto("/sites/maze/");
  await expect(page.locator("canvas#maze")).toBeVisible();

  const canvas = page.locator("canvas#maze");
  const toggle = page.locator("#toggle");

  // Use the largest grid + slowest speed so the search stays in its EXPLORING
  // phase long enough to observe a pause/resume via the keyboard.
  await page.locator("#size").selectOption("51");
  await page.locator("#speed").evaluate((el) => {
    el.value = el.min;
    el.dispatchEvent(new Event("input", { bubbles: true }));
  });

  // New maze via keyboard ("n"): explored count drops back to a small number
  // and the status returns to searching.
  await canvas.focus();
  await page.keyboard.press("n");

  await expect
    .poll(async () => status(page), {
      message: "'n' should kick off a new search (status -> Searching…)",
      timeout: 10000,
    })
    .toContain("Searching");

  await expect
    .poll(async () => Number((await page.locator("#stat-explored").textContent()) ?? "0"), {
      message: "explored count should reset to a small number after a new maze",
      timeout: 10000,
    })
    .toBeLessThan(50);

  // The slow search auto-plays: toggle reflects the running state.
  await expect(toggle, "running after new maze").toHaveAttribute("aria-pressed", "true", {
    timeout: 10000,
  });
  await expect(toggle).toHaveText("Pause");

  // Space pauses: aria-pressed flips to "false" and the label changes.
  await canvas.focus();
  await page.keyboard.press("Space");
  await expect(toggle, "Space pauses: aria-pressed -> false").toHaveAttribute(
    "aria-pressed",
    "false",
    { timeout: 10000 },
  );
  await expect(toggle, "paused label is not 'Pause'").not.toHaveText("Pause");

  // Space again resumes the search: aria-pressed flips back to "true".
  await canvas.focus();
  await page.keyboard.press("Space");
  await expect(toggle, "Space resumes: aria-pressed -> true").toHaveAttribute(
    "aria-pressed",
    "true",
    { timeout: 10000 },
  );

  expect(pageErrors, `unexpected console errors / exceptions: ${pageErrors.join(" | ")}`).toEqual([]);
});
