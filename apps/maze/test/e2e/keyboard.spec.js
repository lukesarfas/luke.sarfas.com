// Keyboard operability (docs/SPEC.md §7): every control reachable from the
// keyboard. "n" generates a fresh maze that waits for the user (no autoplay);
// Space then starts it and toggles play/pause. Assertions poll to stay
// timing-safe; the slowest speed keeps the search in its EXPLORING phase.
import { test, expect } from "./fixtures.js";

async function status(page) {
  return ((await page.locator("#stat-status").textContent()) ?? "").trim();
}

test("'n' makes a fresh paused maze; Space toggles play/pause", async ({ page, pageErrors }) => {
  await page.goto("/sites/maze/");
  await expect(page.locator("canvas#maze")).toBeVisible();

  const canvas = page.locator("canvas#maze");
  const toggle = page.locator("#toggle");

  // Larger grid + slowest speed so the search stays in EXPLORING long enough.
  await page.locator("#size").fill("51");
  await page.locator("#speed").evaluate((el) => {
    el.value = el.min;
    el.dispatchEvent(new Event("input", { bubbles: true }));
  });

  // New maze via keyboard ("n"): a fresh maze that does NOT auto-play.
  await canvas.focus();
  await page.keyboard.press("n");

  await expect
    .poll(() => status(page), { message: "'n' shows a fresh, ready maze", timeout: 10000 })
    .toContain("Ready");
  await expect
    .poll(async () => Number((await page.locator("#stat-explored").textContent()) ?? "0"), {
      message: "explored resets after a new maze",
      timeout: 10000,
    })
    .toBeLessThan(50);

  // It is paused (waiting for the user), not running.
  await expect(toggle, "new maze is paused").toHaveAttribute("aria-pressed", "false");
  await expect(toggle).toHaveText("Play");

  // Space starts the search: aria-pressed -> true, label -> Pause.
  await canvas.focus();
  await page.keyboard.press("Space");
  await expect(toggle, "Space starts the search").toHaveAttribute("aria-pressed", "true", {
    timeout: 10000,
  });
  await expect(toggle).toHaveText("Pause");

  // Space again pauses: aria-pressed -> false.
  await canvas.focus();
  await page.keyboard.press("Space");
  await expect(toggle, "Space pauses").toHaveAttribute("aria-pressed", "false", { timeout: 10000 });

  expect(pageErrors, `unexpected console errors / exceptions: ${pageErrors.join(" | ")}`).toEqual([]);
});
