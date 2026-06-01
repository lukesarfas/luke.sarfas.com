// Launch smoke — the core "never crashes on launch, all UI visible" guarantee
// for the deployed showcase (docs/SPEC.md §4 F7, §10, §12.5).
import { test, expect } from "./fixtures.js";

// Sample the canvas pixels and report whether anything differs from the flat
// background. Runs in the page so it reads the live 2D backing store.
async function canvasIsNonBlank(page) {
  return page.evaluate(() => {
    const canvas = document.getElementById("maze");
    if (!canvas) return { ok: false, reason: "no canvas" };
    if (!canvas.width || !canvas.height) {
      return { ok: false, reason: `zero backing store ${canvas.width}x${canvas.height}` };
    }
    const ctx = canvas.getContext("2d");
    let img;
    try {
      img = ctx.getImageData(0, 0, canvas.width, canvas.height);
    } catch (e) {
      return { ok: false, reason: `getImageData failed: ${e.message}` };
    }
    const data = img.data;
    // The flat background is the first pixel; treat the maze as non-blank if any
    // pixel differs from it (walls, start, goal, explored… all qualify).
    const r0 = data[0];
    const g0 = data[1];
    const b0 = data[2];
    let differing = 0;
    for (let i = 0; i < data.length; i += 4) {
      if (data[i] !== r0 || data[i + 1] !== g0 || data[i + 2] !== b0) {
        differing++;
        if (differing > 50) break; // plenty; bail early
      }
    }
    return {
      ok: differing > 0,
      differing,
      bg: [r0, g0, b0],
      size: `${canvas.width}x${canvas.height}`,
    };
  });
}

test("showcase launches clean", async ({ page, pageErrors }) => {
  const response = await page.goto("/sites/maze/");
  expect(response, "navigation produced a response").toBeTruthy();
  expect(response.status(), "HTTP status should be < 400").toBeLessThan(400);

  await expect(page.locator("canvas#maze")).toBeVisible();

  await page.waitForLoadState("networkidle");

  expect(pageErrors, `unexpected console errors / exceptions: ${pageErrors.join(" | ")}`).toEqual([]);
});

test("canvas renders (non-blank)", async ({ page }) => {
  await page.goto("/sites/maze/");
  await expect(page.locator("canvas#maze")).toBeVisible();
  await page.waitForLoadState("networkidle");

  // The page auto-plays; give the first frame a beat to paint, then poll.
  await expect
    .poll(async () => (await canvasIsNonBlank(page)).ok, {
      message: "canvas should not be blank (some pixel must differ from background)",
      timeout: 10000,
    })
    .toBe(true);
});

test("all controls visible and operable", async ({ page }) => {
  await page.goto("/sites/maze/");
  await expect(page.locator("canvas#maze")).toBeVisible();

  for (const sel of ["#toggle", "#step", "#new", "#size", "#speed"]) {
    const el = page.locator(sel);
    await expect(el, `${sel} visible`).toBeVisible();
    await expect(el, `${sel} enabled`).toBeEnabled();
  }

  // The engine must actually be running (this is what the production
  // trailing-slash 404 broke: explored stayed stuck at 0). Wait for the search
  // to make progress.
  const explored = () => page.locator("#stat-explored").evaluate((el) => Number(el.textContent));
  await expect
    .poll(explored, { message: "search should advance (explored > 0)", timeout: 10000 })
    .toBeGreaterThan(0);

  // "New maze" must regenerate: explored resets, then climbs again.
  await expect.poll(explored, { timeout: 10000 }).toBeGreaterThan(20);
  const before = await explored();
  await page.locator("#new").click();
  await expect
    .poll(explored, { message: "New maze should reset the explored count", timeout: 5000 })
    .toBeLessThan(before);
});

test("search completes", async ({ page }) => {
  await page.goto("/sites/maze/");
  await expect(page.locator("canvas#maze")).toBeVisible();

  // Crank the speed slider to its max so the solve plays back fast, firing the
  // 'input' event the wiring listens for.
  await page.locator("#speed").evaluate((el) => {
    el.value = el.max;
    el.dispatchEvent(new Event("input", { bubbles: true }));
  });

  await expect(page.locator("#stat-status")).toContainText("Solved", { timeout: 25000 });
});
